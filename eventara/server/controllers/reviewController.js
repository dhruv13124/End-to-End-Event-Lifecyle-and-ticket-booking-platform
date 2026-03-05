import pool from '../config/db.js';

export const createReview = async (req, res, next) => {
    try {
        const { event_id } = req.params;
        const { rating, title, comment } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Valid rating (1-5) is required' });
        }

        // Must have a confirmed/completed booking
        const [bookings] = await pool.query(
            "SELECT id FROM bookings WHERE user_id = ? AND event_id = ? AND status IN ('confirmed', 'completed')",
            [req.user.id, event_id]
        );

        if (bookings.length === 0) {
            return res.status(403).json({ success: false, message: 'You must attend this event to review it' });
        }

        // Insert or update (handle unique constraint)
        const [existing] = await pool.query('SELECT id FROM reviews WHERE user_id = ? AND event_id = ?', [req.user.id, event_id]);

        if (existing.length > 0) {
            await pool.query(
                'UPDATE reviews SET rating = ?, title = ?, comment = ? WHERE id = ?',
                [rating, title || null, comment || null, existing[0].id]
            );
        } else {
            await pool.query(
                'INSERT INTO reviews (user_id, event_id, rating, title, comment) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, event_id, rating, title || null, comment || null]
            );
        }

        res.status(200).json({ success: true, message: 'Review saved successfully' });
    } catch (err) {
        next(err);
    }
};

export const getReviews = async (req, res, next) => {
    try {
        const { event_id } = req.params;

        const [reviews] = await pool.query(`
      SELECT r.*, u.full_name as user_name, u.avatar_url 
      FROM reviews r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.event_id = ? AND r.is_approved = TRUE
      ORDER BY r.created_at DESC
    `, [event_id]);

        const [stats] = await pool.query(`
      SELECT 
        AVG(rating) as avg_rating, 
        COUNT(id) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as stars_5,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as stars_4,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as stars_3,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as stars_2,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as stars_1
      FROM reviews WHERE event_id = ? AND is_approved = TRUE
    `, [event_id]);

        res.status(200).json({
            success: true,
            data: reviews,
            stats: stats[0]
        });
    } catch (err) {
        next(err);
    }
};

export const deleteReview = async (req, res, next) => {
    try {
        const { reviewId } = req.params;

        const [reviews] = await pool.query('SELECT user_id FROM reviews WHERE id = ?', [reviewId]);
        if (reviews.length === 0) return res.status(404).json({ success: false, message: 'Review not found' });

        if (reviews[0].user_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await pool.query('DELETE FROM reviews WHERE id = ?', [reviewId]);
        res.status(200).json({ success: true, message: 'Review deleted' });
    } catch (err) {
        next(err);
    }
};
