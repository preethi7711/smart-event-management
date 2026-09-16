const Registration = require('../models/Registration');
const Attendee = require('../models/Attendee');
const Event = require('../models/Event');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const registrationAgent = require('../services/ai/registrationAgent');
const analyticsService = require('../services/analytics/analyticsService');
const { emitEvent } = require('../services/socket');
const { sendEmail, templates } = require('../services/email/emailService');

/** Finds or creates an Attendee record for a given email/name. */
async function findOrCreateAttendee({ name, email, phone, organization, jobTitle, ageGroup, gender, userId, source }) {
  const normalizedEmail = email.trim().toLowerCase();
  let attendee = await Attendee.findOne({ email: normalizedEmail });
  if (!attendee) {
    attendee = await Attendee.create({
      name, email: normalizedEmail, phone, organization, jobTitle, ageGroup, gender,
      user: userId || null, source: source || 'WEB',
    });
  }
  return attendee;
}

/** Public/attendee-facing registration (web form). */
const registerForEvent = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { name, email, phone, organization, jobTitle, ageGroup, gender } = req.body;

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (!['PUBLISHED', 'ONGOING'].includes(event.status)) {
    throw new ApiError(400, 'This event is not currently open for registration.');
  }
  if (event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
    throw new ApiError(400, 'The registration deadline for this event has passed.');
  }

  const validation = registrationAgent.validateRegistration({ name, email });
  if (!validation.valid) throw new ApiError(400, validation.errors.join(' '));

  const attendee = await findOrCreateAttendee({
    name, email, phone, organization, jobTitle, ageGroup, gender,
    userId: req.user ? req.user._id : null, source: 'WEB',
  });

  const existing = await Registration.find({ event: eventId }).populate('attendee');
  const dup = registrationAgent.detectDuplicate(existing, email);
  if (dup.isDuplicate) {
    throw new ApiError(409, 'This email is already registered for this event.');
  }

  const { category, confidence } = registrationAgent.categorize({ jobTitle, organization });

  const registration = await Registration.create({
    event: eventId,
    attendee: attendee._id,
    category,
    status: event.requiresApproval ? 'PENDING' : 'APPROVED',
    aiInsight: { categoryConfidence: confidence, flags: [] },
    reviewedAt: event.requiresApproval ? null : new Date(),
  });

  const populated = await registration.populate('attendee');

  const tmpl = templates.registrationReceived(attendee.name, event.title);
  await sendEmail({ to: attendee.email, subject: tmpl.subject, html: tmpl.html, type: 'REGISTRATION_RECEIVED', event: event._id });

  if (!event.requiresApproval) {
    const approvedTmpl = templates.registrationApproved(attendee.name, event.title, registration.checkInCode);
    await sendEmail({ to: attendee.email, subject: approvedTmpl.subject, html: approvedTmpl.html, type: 'REGISTRATION_APPROVED', event: event._id });
  }

  emitEvent('registration.created', { eventId, registrationId: registration._id, status: registration.status }, eventId);
  res.status(201).json({ success: true, registration: populated });
});

/** Organizer-created or CSV-imported registration (bypasses approval flow, marked as organizer-created). */
const createRegistrationByOrganizer = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { name, email, phone, organization, jobTitle, category, status, ageGroup, gender } = req.body;

  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  const validation = registrationAgent.validateRegistration({ name, email });
  if (!validation.valid) throw new ApiError(400, validation.errors.join(' '));

  const attendee = await findOrCreateAttendee({
    name, email, phone, organization, jobTitle, ageGroup, gender, source: 'ORGANIZER_CREATED',
  });

  const existing = await Registration.find({ event: eventId }).populate('attendee');
  const dup = registrationAgent.detectDuplicate(existing, email);
  if (dup.isDuplicate) throw new ApiError(409, 'This attendee is already registered for this event.');

  const autoCategory = category || registrationAgent.categorize({ jobTitle, organization }).category;

  const registration = await Registration.create({
    event: eventId,
    attendee: attendee._id,
    category: autoCategory,
    status: status || 'APPROVED',
    reviewedBy: req.user._id,
    reviewedAt: new Date(),
  });

  const populated = await registration.populate('attendee');
  emitEvent('registration.created', { eventId, registrationId: registration._id, status: registration.status }, eventId);
  res.status(201).json({ success: true, registration: populated });
});

/** Bulk CSV import: expects req.body.rows = [{name,email,phone,organization,jobTitle}] */
const bulkImportRegistrations = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { rows } = req.body;
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found.');
  if (!Array.isArray(rows) || rows.length === 0) throw new ApiError(400, 'rows must be a non-empty array.');

  const results = { created: 0, skipped: 0, errors: [] };
  const existing = await Registration.find({ event: eventId }).populate('attendee');

  for (const row of rows) {
    const validation = registrationAgent.validateRegistration({ name: row.name, email: row.email });
    if (!validation.valid) {
      results.errors.push({ row, errors: validation.errors });
      continue;
    }
    const dup = registrationAgent.detectDuplicate(existing, row.email);
    if (dup.isDuplicate) {
      results.skipped += 1;
      continue;
    }
    const attendee = await findOrCreateAttendee({ ...row, source: 'IMPORTED' });
    const autoCategory = registrationAgent.categorize({ jobTitle: row.jobTitle, organization: row.organization }).category;
    const reg = await Registration.create({
      event: eventId, attendee: attendee._id, category: autoCategory, status: 'APPROVED',
      reviewedBy: req.user._id, reviewedAt: new Date(),
    });
    existing.push({ attendee: { email: row.email.toLowerCase() } });
    results.created += 1;
    emitEvent('registration.created', { eventId, registrationId: reg._id, status: 'APPROVED' }, eventId);
  }

  res.json({ success: true, ...results });
});

const getRegistrations = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { status, category, search, page = 1, limit = 50 } = req.query;
  const filter = { event: eventId };
  if (status) filter.status = status;
  if (category) filter.category = category;

  let query = Registration.find(filter).populate('attendee').populate('reviewedBy', 'name email');
  const skip = (Number(page) - 1) * Number(limit);
  let registrations = await query.sort({ createdAt: -1 });

  if (search) {
    const s = search.toLowerCase();
    registrations = registrations.filter(
      (r) => r.attendee && (r.attendee.name.toLowerCase().includes(s) || r.attendee.email.toLowerCase().includes(s))
    );
  }

  const total = registrations.length;
  const paged = registrations.slice(skip, skip + Number(limit));

  res.json({ success: true, registrations: paged, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

const reviewRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { decision, rejectionReason } = req.body; // decision: 'APPROVED' | 'REJECTED'
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ApiError(400, 'decision must be APPROVED or REJECTED.');

  const registration = await Registration.findById(id).populate('attendee').populate('event');
  if (!registration) throw new ApiError(404, 'Registration not found.');

  registration.status = decision;
  registration.reviewedBy = req.user._id;
  registration.reviewedAt = new Date();
  if (decision === 'REJECTED') registration.rejectionReason = rejectionReason || '';
  await registration.save();

  if (decision === 'APPROVED') {
    const tmpl = templates.registrationApproved(registration.attendee.name, registration.event.title, registration.checkInCode);
    await sendEmail({ to: registration.attendee.email, subject: tmpl.subject, html: tmpl.html, type: 'REGISTRATION_APPROVED', event: registration.event._id });
    emitEvent('registration.approved', { eventId: registration.event._id, registrationId: registration._id }, registration.event._id);
  } else {
    const tmpl = templates.registrationRejected(registration.attendee.name, registration.event.title, rejectionReason);
    await sendEmail({ to: registration.attendee.email, subject: tmpl.subject, html: tmpl.html, type: 'REGISTRATION_REJECTED', event: registration.event._id });
    emitEvent('registration.rejected', { eventId: registration.event._id, registrationId: registration._id }, registration.event._id);
  }

  res.json({ success: true, registration });
});

const getRegistrationInsights = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  const stats = await analyticsService.getEventRegistrationStats(eventId);
  const result = await registrationAgent.generateRegistrationInsights(event, stats);

  res.json({ success: true, stats, insights: result.insights, source: result.source });
});

module.exports = {
  registerForEvent, createRegistrationByOrganizer, bulkImportRegistrations,
  getRegistrations, reviewRegistration, getRegistrationInsights,
};
