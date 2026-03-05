import pool from '../config/db.js';

export const getMyNotifications = async (req, res, next) => {
    try {
        const { limit = 20, offset = 0 } = req.query;
        const [notifications] = await pool.query(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [req.user.id, parseInt(limit), parseInt(offset)]);

        res.status(200).json({ success: true, data: notifications });
    } catch (err) {
        next(err);
    }
};

export const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?', [id, req.user.id]);
        res.status(200).json({ success: true });
    } catch (err) {
        next(err);
    }
};

export const markAllAsRead = async (req, res, next) => {
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]);
        res.status(200).json({ success: true });
    } catch (err) {
        next(err);
    }
};

export const getUnreadCount = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE', [req.user.id]);
        res.status(200).json({ success: true, count: rows[0].count });
    } catch (err) {
        next(err);
    }
};
