const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const Alert = require('../models/Alert');
const orchestrator = require('../services/ai/orchestrator');

const getAgentsStatus = asyncHandler(async (req, res) => {
  // Return the status of implemented agents
  const agents = [
    { name: 'Venue Agent', status: 'Active', description: 'Venue suitability, capacity and recommendations', endpoint: 'Internal' },
    { name: 'Speaker Agent', status: 'Active', description: 'Speaker matching, availability and conflicts', endpoint: 'Internal' },
    { name: 'Incident Agent', status: 'Active', description: 'Incident priority and response recommendations', endpoint: 'Internal' },
    { name: 'Sponsor Agent', status: 'Active', description: 'Sponsor matching and contract/deliverable health', endpoint: 'Internal' },
    { name: 'Analytics Agent', status: 'Active', description: 'Attendance, sessions, utilization and event analytics', endpoint: 'Internal' }
  ];
  res.json({ success: true, agents });
});

const runScenario = asyncHandler(async (req, res) => {
  const { scenario, eventId } = req.body;
  if (!scenario) throw new ApiError(400, 'Scenario is required');
  
  // Hand off to the orchestrator for predefined scenarios
  const result = await orchestrator.handleScenario(scenario, req.user, eventId);
  
  res.json({ success: true, ...result });
});

const getAlerts = asyncHandler(async (req, res) => {
  // Retrieve alerts, restricted by role
  let filter = {};
  if (req.user.role !== 'ADMIN') {
     // Organizers see alerts for their events
     const Event = require('../models/Event');
     const userEvents = await Event.find({ organizer: req.user._id }).select('_id');
     filter = { event: { $in: userEvents.map(e => e._id) } };
  }
  
  const alerts = await Alert.find(filter).populate('event', 'title').sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, alerts });
});

module.exports = { getAgentsStatus, runScenario, getAlerts };
