const Speaker = require('../models/Speaker');
const Session = require('../models/Session');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const speakerAgent = require('../services/ai/speakerAgent');
const { emitEvent } = require('../services/socket');

const createSpeaker = asyncHandler(async (req, res) => {
  const speaker = await Speaker.create(req.body);
  res.status(201).json({ success: true, speaker });
});

const getSpeakers = asyncHandler(async (req, res) => {
  const { expertise, search } = req.query;
  const filter = { isActive: true };
  if (expertise) filter.expertise = { $in: [new RegExp(expertise, 'i')] };
  if (search) filter.name = { $regex: search, $options: 'i' };
  const speakers = await Speaker.find(filter).sort({ averageRating: -1 });
  res.json({ success: true, speakers });
});

const getSpeakerById = asyncHandler(async (req, res) => {
  const speaker = await Speaker.findById(req.params.id);
  if (!speaker) throw new ApiError(404, 'Speaker not found.');
  const sessions = await Session.find({ speaker: speaker._id }).populate('event', 'title').populate('room', 'name');
  res.json({ success: true, speaker, sessions });
});

const updateSpeaker = asyncHandler(async (req, res) => {
  const speaker = await Speaker.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!speaker) throw new ApiError(404, 'Speaker not found.');
  res.json({ success: true, speaker });
});

/**
 * AI Speaker Recommendation for a given session: ranks speakers using
 * deterministic expertise/availability/rating scoring + optional LLM narrative.
 */
const recommendSpeakers = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.sessionId);
  if (!session) throw new ApiError(404, 'Session not found.');

  const speakers = await Speaker.find({ isActive: true });

  // Build a map of speakerId -> other sessions they're already assigned to, for conflict checking
  const existingSessionsBySpeaker = {};
  await Promise.all(
    speakers.map(async (sp) => {
      const others = await Session.find({ speaker: sp._id, _id: { $ne: session._id } }).select('startTime endTime title');
      existingSessionsBySpeaker[sp._id.toString()] = others;
    })
  );

  const result = await speakerAgent.rankSpeakers(speakers, session, existingSessionsBySpeaker);
  res.json({ success: true, ...result });
});

/**
 * Assigns a speaker to a session, enforcing a real conflict check backend-side
 * (never trusting that the AI recommendation was followed).
 */
const assignSpeaker = asyncHandler(async (req, res) => {
  const { speakerId } = req.body;
  const session = await Session.findById(req.params.sessionId);
  if (!session) throw new ApiError(404, 'Session not found.');
  const speaker = await Speaker.findById(speakerId);
  if (!speaker) throw new ApiError(404, 'Speaker not found.');

  const overlapping = await Session.findOne({
    _id: { $ne: session._id },
    speaker: speaker._id,
    startTime: { $lt: session.endTime },
    endTime: { $gt: session.startTime },
  });
  if (overlapping) {
    throw new ApiError(409, `Speaker is already booked for "${overlapping.title}" at an overlapping time.`);
  }

  const isUnavailable = (speaker.unavailableDates || []).some(
    (d) => new Date(d).toDateString() === new Date(session.startTime).toDateString()
  );
  if (isUnavailable) {
    throw new ApiError(409, 'Speaker has marked this date as unavailable.');
  }

  session.speaker = speaker._id;
  if (session.status === 'DRAFT') session.status = 'SCHEDULED';
  await session.save();

  emitEvent('speaker.assigned', { sessionId: session._id, speakerId: speaker._id }, session.event);
  res.json({ success: true, session });
});

module.exports = { createSpeaker, getSpeakers, getSpeakerById, updateSpeaker, recommendSpeakers, assignSpeaker };
