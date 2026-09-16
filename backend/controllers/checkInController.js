const CheckIn = require('../models/CheckIn');
const Registration = require('../models/Registration');
const Session = require('../models/Session');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { emitEvent } = require('../services/socket');

/**
 * Checks in an attendee via their unique checkInCode (from QR or manual entry).
 * `sessionId` optional: null = event-level check-in, otherwise a specific session.
 * Backend enforces: registration must be APPROVED, and no duplicate check-in
 * for the same (registration, session) pair.
 */
const checkIn = asyncHandler(async (req, res) => {
  const { checkInCode, sessionId, method } = req.body;
  if (!checkInCode) throw new ApiError(400, 'checkInCode is required.');

  const registration = await Registration.findOne({ checkInCode }).populate('attendee').populate('event');
  if (!registration) throw new ApiError(404, 'Invalid check-in code.');
  if (registration.status !== 'APPROVED') {
    throw new ApiError(400, `Cannot check in: registration status is ${registration.status}.`);
  }

  let session = null;
  if (sessionId) {
    session = await Session.findById(sessionId);
    if (!session) throw new ApiError(404, 'Session not found.');
  }

  const existing = await CheckIn.findOne({ registration: registration._id, session: session ? session._id : null });
  if (existing) {
    throw new ApiError(409, `Already checked in ${session ? `for session "${session.title}"` : 'for this event'} at ${existing.checkedInAt.toLocaleString()}.`);
  }

  const record = await CheckIn.create({
    event: registration.event._id,
    registration: registration._id,
    attendee: registration.attendee._id,
    session: session ? session._id : null,
    method: method || 'QR',
    checkedInBy: req.user ? req.user._id : null,
  });

  emitEvent(
    'checkin.created',
    {
      eventId: registration.event._id,
      checkInId: record._id,
      attendeeName: registration.attendee.name,
      sessionId: session ? session._id : null,
      sessionTitle: session ? session.title : null,
    },
    registration.event._id
  );

  res.status(201).json({ success: true, checkIn: record, attendee: registration.attendee, event: registration.event, session });
});

const getCheckInsByEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { sessionId } = req.query;
  const filter = { event: eventId };
  if (sessionId) filter.session = sessionId;
  else if (sessionId === 'null') filter.session = null;

  const checkIns = await CheckIn.find(filter).populate('attendee').populate('session', 'title').sort({ checkedInAt: -1 });
  res.json({ success: true, checkIns });
});

module.exports = { checkIn, getCheckInsByEvent };
