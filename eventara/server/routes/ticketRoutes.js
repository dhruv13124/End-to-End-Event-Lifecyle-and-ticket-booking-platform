import express from 'express';
import { getMyTickets, getTicketDetails, downloadTicket, checkinTicket, verifyTicketPublic } from '../controllers/ticketController.js';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/verify/:ticketCode', verifyTicketPublic);

router.use(verifyToken);
router.get('/my', getMyTickets);
router.get('/:ticketCode', getTicketDetails);
router.get('/:ticketCode/download', downloadTicket);

router.post('/:ticketCode/checkin', requireRole('organizer', 'admin'), checkinTicket);

export default router;
