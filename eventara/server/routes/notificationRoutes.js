import express from 'express';
import { getMyNotifications, markAsRead, markAllAsRead, getUnreadCount } from '../controllers/notificationController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.get('/my', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.patch('/read/:id', markAsRead);

export default router;
