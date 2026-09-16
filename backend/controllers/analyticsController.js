const Event = require('../models/Event');
const analyticsService = require('../services/analytics/analyticsService');
const analyticsAgent = require('../services/ai/analyticsAgent');
const orchestrator = require('../services/ai/orchestrator');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { emitEvent } = require('../services/socket');

const getEventAnalytics = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  const stats = await analyticsService.getUnifiedEventAnalytics(eventId);
  res.json({ success: true, stats });
});

const getEventAIInsights = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) throw new ApiError(404, 'Event not found.');

  const stats = await analyticsService.getUnifiedEventAnalytics(eventId);
  const result = await analyticsAgent.generateDashboardInsights(event, stats);

  emitEvent('analytics.updated', { eventId, insightCount: result.insights.length }, eventId);
  res.json({ success: true, insights: result.insights, source: result.source });
});

/** Platform-wide (multi-event) KPI summary for admins/organizers. */
const getPlatformOverview = asyncHandler(async (req, res) => {
  const filter = req.user.role === 'ADMIN' ? {} : { organizer: req.user._id };
  const events = await Event.find(filter);

  const perEventStats = await Promise.all(
    events.map(async (e) => {
      const stats = await analyticsService.getUnifiedEventAnalytics(e._id);
      return { eventId: e._id, title: e.title, status: e.status, ...stats };
    })
  );

  const totals = perEventStats.reduce(
    (acc, s) => {
      acc.registrations += s.registrations;
      acc.checkedIn += s.checkedIn;
      acc.sessions += s.sessions.length;
      return acc;
    },
    { registrations: 0, checkedIn: 0, sessions: 0 }
  );

  res.json({
    success: true,
    totalEvents: events.length,
    published: events.filter((e) => e.status === 'PUBLISHED').length,
    ongoing: events.filter((e) => e.status === 'ONGOING').length,
    completed: events.filter((e) => e.status === 'COMPLETED').length,
    totals,
    events: perEventStats,
  });
});

/** Natural Language AI Assistant Endpoint */
const askAssistant = asyncHandler(async (req, res) => {
  const { query, eventId } = req.body;
  if (!query) throw new ApiError(400, 'Query is required.');
  
  const result = await orchestrator.handleQuery(query, req.user, eventId);
  res.json({ success: true, ...result });
});

module.exports = { getEventAnalytics, getEventAIInsights, getPlatformOverview, askAssistant };
