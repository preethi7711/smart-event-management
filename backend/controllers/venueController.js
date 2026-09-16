const Venue = require('../models/Venue');
const Room = require('../models/Room');
const Event = require('../models/Event');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const venueAgent = require('../services/ai/venueAgent');
const { emitEvent } = require('../services/socket');

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const createVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.create(req.body);
  await Room.create({
    venue: venue._id,
    name: 'Main Hall',
    capacity: venue.totalCapacity || 100,
    facilities: venue.facilities || []
  });
  res.status(201).json({ success: true, venue });
});

const getVenues = asyncHandler(async (req, res) => {
  const { city, minCapacity, search } = req.query;
  const filter = { isActive: true };
  if (city) filter.city = { $regex: city, $options: 'i' };
  if (minCapacity) filter.totalCapacity = { $gte: Number(minCapacity) };
  if (search) filter.name = { $regex: search, $options: 'i' };

  const venues = await Venue.find(filter).sort({ rating: -1 });
  res.json({ success: true, venues });
});

const getVenueById = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) throw new ApiError(404, 'Venue not found.');
  const rooms = await Room.find({ venue: venue._id, isActive: true });
  res.json({ success: true, venue, rooms });
});

const updateVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!venue) throw new ApiError(404, 'Venue not found.');
  res.json({ success: true, venue });
});

const createRoom = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.venueId);
  if (!venue) throw new ApiError(404, 'Venue not found.');
  const room = await Room.create({ ...req.body, venue: venue._id });
  res.status(201).json({ success: true, room });
});

const getRoomsByVenue = asyncHandler(async (req, res) => {
  let rooms = await Room.find({ venue: req.params.venueId, isActive: true });
  if (rooms.length === 0) {
    const venue = await Venue.findById(req.params.venueId);
    if (venue) {
      const defaultRoom = await Room.create({
        venue: venue._id,
        name: 'Main Hall',
        capacity: venue.totalCapacity || 100,
        facilities: venue.facilities || []
      });
      rooms = [defaultRoom];
    }
  }
  res.json({ success: true, rooms });
});

/**
 * AI Venue Recommendation: ranks all active venues against an event's
 * requirements using the deterministic scoring engine (+ optional LLM narrative).
 */
const recommendVenues = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  const venues = await Venue.find({ isActive: true });

  // Availability = venue has at least one room with enough capacity and not locked by someone else
  const availabilityMap = {};
  for (const venue of venues) {
    const rooms = await Room.find({ venue: venue._id, isActive: true });
    const suitableRoom = rooms.find((r) => r.capacity >= (event.requiredCapacity || 0) && !r.isCurrentlyLocked(req.user._id));
    availabilityMap[venue._id.toString()] = Boolean(suitableRoom) || rooms.length === 0; // if no rooms modeled yet, don't penalize
  }

  const result = await venueAgent.rankVenues(venues, event, availabilityMap);
  res.json({ success: true, ...result });
});

/**
 * Temporarily locks a room for this organizer while they finalize booking.
 * Prevents double-booking during the decision window. Auto-expires.
 */
const lockRoom = asyncHandler(async (req, res) => {
  const { roomId, eventId } = req.body;
  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, 'Room not found.');

  if (room.isCurrentlyLocked(req.user._id)) {
    throw new ApiError(409, 'Room is currently locked by another organizer. Try again shortly.');
  }

  room.lockedBy = req.user._id;
  room.lockedForEvent = eventId || null;
  room.lockExpiresAt = new Date(Date.now() + LOCK_DURATION_MS);
  await room.save();

  emitEvent('venue.locked', { roomId: room._id, venueId: room.venue, lockedBy: req.user._id, expiresAt: room.lockExpiresAt }, eventId);
  res.json({ success: true, room, lockExpiresAt: room.lockExpiresAt });
});

const releaseRoomLock = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.roomId);
  if (!room) throw new ApiError(404, 'Room not found.');

  if (room.lockedBy && room.lockedBy.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
    throw new ApiError(403, 'You cannot release a lock held by another user.');
  }

  room.lockedBy = null;
  room.lockedForEvent = null;
  room.lockExpiresAt = null;
  await room.save();

  emitEvent('venue.released', { roomId: room._id, venueId: room.venue });
  res.json({ success: true, room });
});

/**
 * Books a venue+room for an event. Enforces the lock (must be held by this
 * user or already expired/unlocked) and prevents double-booking by checking
 * for other events already assigned to this room with overlapping dates.
 */
const bookVenue = asyncHandler(async (req, res) => {
  const { eventId, venueId, roomId } = req.body;
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (req.user.role !== 'ADMIN' && event.organizer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to book a venue for this event.');
  }

  const venue = await Venue.findById(venueId);
  if (!venue) throw new ApiError(404, 'Venue not found.');
  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, 'Room not found.');

  if (room.isCurrentlyLocked(req.user._id)) {
    throw new ApiError(409, 'This room is currently locked by another organizer.');
  }

  // Double-booking prevention: check other PUBLISHED/PLANNING events using this room with date overlap
  const conflicting = await Event.findOne({
    _id: { $ne: event._id },
    room: room._id,
    status: { $in: ['PLANNING', 'PUBLISHED', 'ONGOING'] },
    startDate: { $lt: event.endDate },
    endDate: { $gt: event.startDate },
  });
  if (conflicting) {
    throw new ApiError(409, `Room is already booked for overlapping event "${conflicting.title}".`);
  }

  event.venue = venue._id;
  event.room = room._id;
  event.status = event.status === 'DRAFT' ? 'PLANNING' : event.status;
  await event.save();

  // Release any lock now that booking is confirmed
  if (room.lockedBy && room.lockedBy.toString() === req.user._id.toString()) {
    room.lockedBy = null;
    room.lockedForEvent = null;
    room.lockExpiresAt = null;
    await room.save();
  }

  await event.populate('venue room');

  emitEvent('venue.booked', { eventId: event._id, venueId: venue._id, roomId: room._id }, event._id);
  res.json({ success: true, event });
});

module.exports = {
  createVenue, getVenues, getVenueById, updateVenue,
  createRoom, getRoomsByVenue,
  recommendVenues, lockRoom, releaseRoomLock, bookVenue,
};
