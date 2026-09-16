const express = require('express');
const {
  createSpeaker, getSpeakers, getSpeakerById, updateSpeaker, recommendSpeakers, assignSpeaker,
} = require('../controllers/speakerController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getSpeakers);
router.get('/:id', getSpeakerById);
router.post('/', protect, authorize('ADMIN', 'ORGANIZER'), createSpeaker);
router.put('/:id', protect, authorize('ADMIN', 'ORGANIZER'), updateSpeaker);

router.get('/recommend/:sessionId', protect, authorize('ADMIN', 'ORGANIZER'), recommendSpeakers);
router.post('/assign/:sessionId', protect, authorize('ADMIN', 'ORGANIZER'), assignSpeaker);

module.exports = router;
