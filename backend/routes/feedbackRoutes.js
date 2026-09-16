const express = require('express');
const {
  rateSpeaker, submitFeedback, getSessionInsights, getFeedbackByEvent,
} = require('../controllers/feedbackController');
const { optionalAuth, protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/session/:sessionId/rate', optionalAuth, rateSpeaker);
router.post('/:eventId', optionalAuth, submitFeedback);
router.get('/session/:sessionId/insights', protect, authorize('ADMIN', 'ORGANIZER'), getSessionInsights);
router.get('/event/:eventId', protect, authorize('ADMIN', 'ORGANIZER'), getFeedbackByEvent);

module.exports = router;
