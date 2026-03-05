import express from 'express';
import { getAdminAnalytics, getOrganizerAnalytics, getAttendeeAnalytics } from '../controllers/analyticsController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/admin', requireRole('admin'), getAdminAnalytics);
router.get('/organizer', requireRole('organizer', 'admin'), getOrganizerAnalytics);
router.get('/attendee', getAttendeeAnalytics);

export default router;
