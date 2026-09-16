const express = require('express');
const { checkIn, getCheckInsByEvent } = require('../controllers/checkInController');
const { optionalAuth, protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', optionalAuth, checkIn);
router.get('/event/:eventId', protect, authorize('ADMIN', 'ORGANIZER'), getCheckInsByEvent);

module.exports = router;
