import express from 'express';
import { createReview, getReviews, deleteReview } from '../controllers/reviewController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:event_id', getReviews);

// Protected routes
router.use(verifyToken);
router.post('/:event_id', createReview);
router.delete('/:reviewId', deleteReview);

export default router;
