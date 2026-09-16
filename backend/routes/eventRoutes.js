const express = require('express');
const {
  createEvent, getEvents, getEventById, updateEvent, publishEvent, deleteEvent,
} = require('../controllers/eventController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', optionalAuth, getEvents);
router.get('/:id', getEventById);
router.post('/', protect, authorize('ADMIN', 'ORGANIZER'), createEvent);
router.put('/:id', protect, authorize('ADMIN', 'ORGANIZER'), updateEvent);
router.post('/:id/publish', protect, authorize('ADMIN', 'ORGANIZER'), publishEvent);
router.delete('/:id', protect, authorize('ADMIN', 'ORGANIZER'), deleteEvent);

module.exports = router;
