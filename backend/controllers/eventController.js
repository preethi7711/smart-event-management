const Event = require('../models/Event');
const Session = require('../models/Session');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { emitEvent } = require('../services/socket');

function slugify(title) {
  return `${title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}-${Date.now().toString(36)}`;
}

const createEvent = asyncHandler(async (req, res) => {
  const {
    title, description, category, startDate, endDate, expectedAttendance,
    budget, requiredCapacity, requiredFacilities, registrationDeadline,
    requiresApproval, tags, coverImage,
  } = req.body;

  if (!title || !description || !startDate || !endDate) {
    throw new ApiError(400, 'Title, description, startDate, and endDate are required.');
  }
  if (new Date(endDate) < new Date(startDate)) {
    throw new ApiError(400, 'endDate cannot be before startDate.');
  }

  const event = await Event.create({
    title,
    slug: slugify(title),
    description,
    category,
    startDate,
    endDate,
    expectedAttendance,
    budget,
    requiredCapacity,
    requiredFacilities,
    registrationDeadline,
    requiresApproval: requiresApproval !== undefined ? requiresApproval : true,
    tags,
    coverImage,
    organizer: req.user._id,
  });

  res.status(201).json({ success: true, event });
});

const getEvents = asyncHandler(async (req, res) => {
  const { status, organizer, search, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (organizer) filter.organizer = organizer;
  if (search) filter.title = { $regex: search, $options: 'i' };

  // Non-organizers/admins only see published+ events
  if (!req.user || req.user.role === 'ATTENDEE') {
    filter.status = { $in: ['PUBLISHED', 'ONGOING', 'COMPLETED'] };
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [events, total] = await Promise.all([
    Event.find(filter)
      .populate('organizer', 'name email')
      .populate('venue', 'name city')
      .populate('room', 'name capacity')
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(Number(limit)),
    Event.countDocuments(filter),
  ]);

  res.json({ success: true, events, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id)
    .populate('organizer', 'name email')
    .populate('venue')
    .populate('room');
  if (!event) throw new ApiError(404, 'Event not found.');
  res.json({ success: true, event });
});

const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found.');

  if (req.user.role !== 'ADMIN' && event.organizer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to modify this event.');
  }

  const updatable = [
    'title', 'description', 'category', 'startDate', 'endDate', 'expectedAttendance',
    'budget', 'requiredCapacity', 'requiredFacilities', 'registrationDeadline',
    'requiresApproval', 'tags', 'coverImage', 'venue', 'room',
  ];
  updatable.forEach((field) => {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  });

  await event.save();
  emitEvent('schedule.updated', { eventId: event._id, message: 'Event details updated.' }, event._id);
  res.json({ success: true, event });
});

const publishEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (req.user.role !== 'ADMIN' && event.organizer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to publish this event.');
  }
  if (!event.venue) throw new ApiError(400, 'Cannot publish an event without a booked venue.');

  const sessionCount = await Session.countDocuments({ event: event._id });
  const conflictCount = await Session.countDocuments({ event: event._id, status: 'CONFLICT' });
  if (conflictCount > 0) {
    throw new ApiError(400, `Cannot publish: ${conflictCount} unresolved scheduling conflict(s) exist.`);
  }
  if (sessionCount === 0) {
    throw new ApiError(400, 'Cannot publish an event with no sessions.');
  }

  event.status = 'PUBLISHED';
  event.publishedAt = new Date();
  await event.save();

  emitEvent('event.published', { eventId: event._id, title: event.title }, event._id);
  res.json({ success: true, event });
});

const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (req.user.role !== 'ADMIN' && event.organizer.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You are not authorized to delete this event.');
  }
  await event.deleteOne();
  res.json({ success: true, message: 'Event deleted.' });
});

module.exports = { createEvent, getEvents, getEventById, updateEvent, publishEvent, deleteEvent };
