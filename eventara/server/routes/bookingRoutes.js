import express from 'express';
import { createBooking, getMyBookings, getBookingDetails, cancelBooking } from '../controllers/bookingController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.post('/', createBooking);
router.get('/my', getMyBookings);
router.get('/:bookingRef', getBookingDetails);
router.post('/:bookingId/cancel', cancelBooking);

export default router;
