const Rating = require('../models/Rating');
const Feedback = require('../models/Feedback');
const Session = require('../models/Session');
const Speaker = require('../models/Speaker');
const Registration = require('../models/Registration');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const analyticsAgent = require('../services/ai/analyticsAgent');
const { emitEvent } = require('../services/socket');

/** Recomputes and persists a speaker's averageRating/totalSessions from real Rating docs. */
async function recomputeSpeakerRating(speakerId) {
  const ratings = await Rating.find({ speaker: speakerId });
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length : 0;
  const sessionIds = [...new Set(ratings.map((r) => r.session.toString()))];
  await Speaker.findByIdAndUpdate(speakerId, {
    averageRating: Number(avg.toFixed(2)),
    totalSessions: sessionIds.length,
  });
}

const rateSpeaker = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { score, checkInCode } = req.body;

  if (!score || score < 1 || score > 5) throw new ApiError(400, 'score must be between 1 and 5.');

  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found.');
  if (!session.speaker) throw new ApiError(400, 'This session has no assigned speaker to rate.');

  const registration = await Registration.findOne({ checkInCode }).populate('attendee');
  if (!registration) throw new ApiError(404, 'Invalid check-in code; cannot verify attendee.');

  const existing = await Rating.findOne({ session: sessionId, attendee: registration.attendee._id });
  if (existing) {
    existing.score = score;
    await existing.save();
  } else {
    await Rating.create({ session: sessionId, speaker: session.speaker, event: session.event, attendee: registration.attendee._id, score });
  }

  await recomputeSpeakerRating(session.speaker);
  emitEvent('feedback.created', { eventId: session.event, sessionId, type: 'rating' }, session.event);

  res.status(201).json({ success: true, message: 'Rating submitted.' });
});

const submitFeedback = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { sessionId, comment, checkInCode } = req.body;

  if (!comment || comment.trim().length < 3) throw new ApiError(400, 'A comment of at least 3 characters is required.');

  const registration = await Registration.findOne({ checkInCode }).populate('attendee');
  if (!registration) throw new ApiError(404, 'Invalid check-in code; cannot verify attendee.');

  const { sentiment, sentimentScore } = analyticsAgent.scoreSentiment(comment);

  const feedback = await Feedback.create({
    event: eventId,
    session: sessionId || null,
    attendee: registration.attendee._id,
    comment: comment.trim(),
    sentiment,
    sentimentScore,
  });

  emitEvent('feedback.created', { eventId, sessionId: sessionId || null, feedbackId: feedback._id }, eventId);
  res.status(201).json({ success: true, feedback });
});

const getSessionInsights = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const session = await Session.findById(sessionId);
  if (!session) throw new ApiError(404, 'Session not found.');

  const ratings = await Rating.find({ session: sessionId });
  const feedbackList = await Feedback.find({ session: sessionId });

  const result = await analyticsAgent.generateSessionInsights(session, ratings, feedbackList);
  res.json({ success: true, ...result });
});

const getFeedbackByEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const feedback = await Feedback.find({ event: eventId }).populate('attendee', 'name').populate('session', 'title').sort({ createdAt: -1 });
  res.json({ success: true, feedback });
});

module.exports = { rateSpeaker, submitFeedback, getSessionInsights, getFeedbackByEvent };
