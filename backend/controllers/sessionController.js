const Session = require('../models/Session');
const Event = require('../models/Event');
const Room = require('../models/Room');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const schedulingAgent = require('../services/ai/schedulingAgent');
const { emitEvent } = require('../services/socket');

const createSession = asyncHandler(async (req, res) => {
  const { event: eventId, title, description, topic, room, speaker, startTime, endTime, capacity, sessionType } = req.body;
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (!title || !startTime || !endTime || !capacity) {
    throw new ApiError(400, 'title, startTime, endTime, and capacity are required.');
  }
  if (new Date(endTime) <= new Date(startTime)) {
    throw new ApiError(400, 'endTime must be after startTime.');
  }

  const session = await Session.create({
    event: eventId, title, description, topic, room, speaker, startTime, endTime, capacity, sessionType,
  });

  await recomputeEventConflicts(eventId);
  emitEvent('schedule.updated', { eventId, sessionId: session._id, action: 'created' }, eventId);
  res.status(201).json({ success: true, session });
});

const getSessionsByEvent = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ event: req.params.eventId })
    .populate('speaker', 'name averageRating profileImage')
    .populate('room', 'name capacity')
    .sort({ startTime: 1 });
  res.json({ success: true, sessions });
});

const getSessionById = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id).populate('speaker').populate('room').populate('event', 'title status');
  if (!session) throw new ApiError(404, 'Session not found.');
  res.json({ success: true, session });
});

const updateSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) throw new ApiError(404, 'Session not found.');

  const updatable = ['title', 'description', 'topic', 'room', 'speaker', 'startTime', 'endTime', 'capacity', 'sessionType'];
  updatable.forEach((f) => {
    if (req.body[f] !== undefined) session[f] = req.body[f];
  });
  await session.save();

  await recomputeEventConflicts(session.event);
  emitEvent('schedule.updated', { eventId: session.event, sessionId: session._id, action: 'updated' }, session.event);
  res.json({ success: true, session });
});

const deleteSession = asyncHandler(async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) throw new ApiError(404, 'Session not found.');
  const eventId = session.event;
  await session.deleteOne();
  await recomputeEventConflicts(eventId);
  emitEvent('schedule.updated', { eventId, action: 'deleted' }, eventId);
  res.json({ success: true, message: 'Session deleted.' });
});

/**
 * Recomputes SCHEDULED/CONFLICT status for every session in an event using
 * the deterministic scheduling agent. Called after any create/update/delete.
 */
async function recomputeEventConflicts(eventId) {
  const sessions = await Session.find({ event: eventId });
  const roomIds = [...new Set(sessions.filter((s) => s.room).map((s) => s.room.toString()))];
  const rooms = await Room.find({ _id: { $in: roomIds } });

  const scheduleResult = schedulingAgent.buildSchedule(sessions, rooms);
  await Promise.all(
    scheduleResult.results.map((r) =>
      Session.findByIdAndUpdate(r.sessionId, { status: r.status, conflictReason: r.conflictReason })
    )
  );
  return scheduleResult;
}

/**
 * Runs the full scheduling agent for an event: recomputes conflicts across all
 * sessions and returns a summary + optional LLM explanation.
 */
const generateSchedule = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  const scheduleResult = await recomputeEventConflicts(event._id);
  const explanation = await schedulingAgent.explainSchedule(event, scheduleResult);

  emitEvent('schedule.updated', { eventId: event._id, action: 'regenerated', conflicts: scheduleResult.totalConflicts }, event._id);

  res.json({
    success: true,
    totalSessions: scheduleResult.results.length,
    scheduled: scheduleResult.results.filter((r) => r.status === 'SCHEDULED').length,
    conflicts: scheduleResult.totalConflicts,
    conflictDetails: scheduleResult.conflicts,
    aiExplanation: explanation.recommendation,
    source: explanation.source,
  });
});

module.exports = {
  createSession, getSessionsByEvent, getSessionById, updateSession, deleteSession,
  generateSchedule, recomputeEventConflicts,
};
