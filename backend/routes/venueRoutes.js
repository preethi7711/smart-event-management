const express = require('express');
const {
  createVenue, getVenues, getVenueById, updateVenue,
  createRoom, getRoomsByVenue,
  recommendVenues, lockRoom, releaseRoomLock, bookVenue,
} = require('../controllers/venueController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getVenues);
router.get('/:id', getVenueById);
router.post('/', protect, authorize('ADMIN', 'ORGANIZER'), createVenue);
router.put('/:id', protect, authorize('ADMIN', 'ORGANIZER'), updateVenue);

router.post('/:venueId/rooms', protect, authorize('ADMIN', 'ORGANIZER'), createRoom);
router.get('/:venueId/rooms', getRoomsByVenue);

router.get('/recommend/:eventId', protect, authorize('ADMIN', 'ORGANIZER'), recommendVenues);
router.post('/lock', protect, authorize('ADMIN', 'ORGANIZER'), lockRoom);
router.post('/lock/:roomId/release', protect, authorize('ADMIN', 'ORGANIZER'), releaseRoomLock);
router.post('/book', protect, authorize('ADMIN', 'ORGANIZER'), bookVenue);

module.exports = router;
