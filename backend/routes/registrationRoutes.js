const express = require('express');
const {
  registerForEvent, createRegistrationByOrganizer, bulkImportRegistrations,
  getRegistrations, reviewRegistration, getRegistrationInsights,
} = require('../controllers/registrationController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/:eventId/register', optionalAuth, registerForEvent);
router.post('/:eventId/organizer-create', protect, authorize('ADMIN', 'ORGANIZER'), createRegistrationByOrganizer);
router.post('/:eventId/bulk-import', protect, authorize('ADMIN', 'ORGANIZER'), bulkImportRegistrations);
router.get('/:eventId', protect, authorize('ADMIN', 'ORGANIZER'), getRegistrations);
router.get('/:eventId/insights', protect, authorize('ADMIN', 'ORGANIZER'), getRegistrationInsights);
router.put('/review/:id', protect, authorize('ADMIN', 'ORGANIZER'), reviewRegistration);

module.exports = router;
