import express from 'express';
import {
    getEvents, getFeaturedEvents, getEventBySlug, getManagedEvents,
    createEvent, updateEvent, publishEvent, cancelEvent, featureEvent, deleteEvent,
    getTicketTypes, createTicketType, updateTicketType, deleteTicketType
} from '../controllers/eventController.js';
import { verifyToken, requireRole, optionalAuth } from '../middleware/authMiddleware.js';
import { bannerUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getEvents);
router.get('/featured', getFeaturedEvents);
router.get('/:slug', optionalAuth, getEventBySlug);
router.get('/:eventId/ticket-types', getTicketTypes);

// Protected routes (Organizer & Admin)
router.use(verifyToken);

router.get('/my-events/manage', requireRole('organizer', 'admin'), getManagedEvents);

router.post('/', requireRole('organizer', 'admin'), bannerUpload.single('banner'), createEvent);
router.put('/:id', requireRole('organizer', 'admin'), bannerUpload.single('banner'), updateEvent);
router.patch('/:id/publish', requireRole('organizer', 'admin'), publishEvent);
router.patch('/:id/cancel', requireRole('organizer', 'admin'), cancelEvent);

// Admin only
router.patch('/:id/feature', requireRole('admin'), featureEvent);
router.delete('/:id', requireRole('admin'), deleteEvent);

// Ticket Types
router.post('/:eventId/ticket-types', requireRole('organizer', 'admin'), createTicketType);
router.put('/:eventId/ticket-types/:typeId', requireRole('organizer', 'admin'), updateTicketType);
router.delete('/:eventId/ticket-types/:typeId', requireRole('organizer', 'admin'), deleteTicketType);

export default router;
