const express = require('express');
const {
  createSession, getSessionsByEvent, getSessionById, updateSession, deleteSession, generateSchedule,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/event/:eventId', getSessionsByEvent);
router.get('/:id', getSessionById);
router.post('/', protect, authorize('ADMIN', 'ORGANIZER'), createSession);
router.put('/:id', protect, authorize('ADMIN', 'ORGANIZER'), updateSession);
router.delete('/:id', protect, authorize('ADMIN', 'ORGANIZER'), deleteSession);

router.post('/schedule/:eventId/generate', protect, authorize('ADMIN', 'ORGANIZER'), generateSchedule);

module.exports = router;
