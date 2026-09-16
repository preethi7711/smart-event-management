const express = require('express');
const { getAgentsStatus, runScenario, getAlerts } = require('../controllers/aiOpsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Only ADMIN and EXECUTIVE (if exists, or ORGANIZER) can access AI Ops
router.get('/agents', protect, authorize('ADMIN', 'ORGANIZER'), getAgentsStatus);
router.post('/orchestrate', protect, authorize('ADMIN', 'ORGANIZER'), runScenario);
router.get('/alerts', protect, authorize('ADMIN', 'ORGANIZER'), getAlerts);

module.exports = router;
