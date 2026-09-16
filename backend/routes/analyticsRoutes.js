const express = require('express');
const { getEventAnalytics, getEventAIInsights, getPlatformOverview, askAssistant } = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', protect, authorize('ADMIN', 'ORGANIZER'), getPlatformOverview);
router.get('/event/:eventId', protect, authorize('ADMIN', 'ORGANIZER'), getEventAnalytics);
router.get('/event/:eventId/ai-insights', protect, authorize('ADMIN', 'ORGANIZER'), getEventAIInsights);
router.post('/assistant', protect, authorize('ADMIN', 'ORGANIZER', 'EXECUTIVE'), askAssistant);

module.exports = router;
