import pool from '../config/db.js';

export const getAdminAnalytics = async (req, res, next) => {
    try {
        const [userStats] = await pool.query(`
      SELECT role, COUNT(*) as count FROM users GROUP BY role
    `);

        const [eventStats] = await pool.query(`
      SELECT status, COUNT(*) as count FROM events GROUP BY status
    `);

        const [bookingStats] = await pool.query(`
      SELECT COUNT(*) as total_bookings, SUM(total_amount) as total_revenue
      FROM bookings WHERE status IN ('confirmed', 'completed')
    `);

        const [bookingsPerDay] = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count, SUM(total_amount) as revenue
      FROM bookings 
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) 
      AND status IN ('confirmed', 'completed')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

        const [topEvents] = await pool.query(`
      SELECT e.title, COUNT(b.id) as bookings, SUM(b.total_amount) as revenue
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id AND b.status IN ('confirmed', 'completed')
      GROUP BY e.id
      ORDER BY bookings DESC
      LIMIT 5
    `);

        const [categoryDist] = await pool.query(`
      SELECT category, COUNT(*) as count FROM events GROUP BY category
    `);

        const [revenueByMonth] = await pool.query(`
      SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(total_amount) as revenue
      FROM bookings
      WHERE status IN ('confirmed', 'completed') AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY month
      ORDER BY month ASC
    `);

        res.status(200).json({
            success: true,
            data: {
                total_users: userStats,
                total_events: eventStats,
                total_bookings: bookingStats[0].total_bookings || 0,
                total_revenue: bookingStats[0].total_revenue || 0,
                bookings_per_day: bookingsPerDay,
                top_events: topEvents,
                category_distribution: categoryDist,
                revenue_by_month: revenueByMonth
            }
        });

    } catch (err) {
        next(err);
    }
};

export const getOrganizerAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [eventStats] = await pool.query(`
      SELECT COUNT(*) as total_events FROM events WHERE organizer_id = ?
    `, [userId]);

        const [bookingStats] = await pool.query(`
      SELECT COUNT(b.id) as total_bookings, SUM(b.total_amount) as total_revenue
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      WHERE e.organizer_id = ? AND b.status IN ('confirmed', 'completed')
    `, [userId]);

        const [attendeeStats] = await pool.query(`
      SELECT COUNT(t.id) as total_attendees
      FROM tickets t
      JOIN events e ON t.event_id = e.id
      WHERE e.organizer_id = ? AND t.status IN ('active', 'used')
    `, [userId]);

        const [perEvent] = await pool.query(`
      SELECT e.id as event_id, e.title, 
        COUNT(b.id) as bookings, 
        SUM(b.total_amount) as revenue,
        (SELECT COUNT(*) FROM tickets WHERE event_id = e.id AND status = 'used') as attended_count,
        (SELECT COUNT(*) FROM tickets WHERE event_id = e.id AND status != 'cancelled') as total_tickets,
        (SELECT AVG(rating) FROM reviews WHERE event_id = e.id AND is_approved = TRUE) as avg_rating
      FROM events e
      LEFT JOIN bookings b ON e.id = b.event_id AND b.status IN ('confirmed', 'completed')
      WHERE e.organizer_id = ?
      GROUP BY e.id
    `, [userId]);

        // Format attendance rate
        perEvent.forEach(e => {
            e.attendance_rate = e.total_tickets > 0 ? ((e.attended_count / e.total_tickets) * 100).toFixed(1) : 0;
        });

        const [bookingsTimeline] = await pool.query(`
      SELECT DATE(b.created_at) as date, COUNT(*) as count, SUM(b.total_amount) as revenue
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      WHERE e.organizer_id = ? AND b.created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) AND b.status IN ('confirmed', 'completed')
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC
    `, [userId]);

        const [ticketTypesDist] = await pool.query(`
      SELECT tt.name, COUNT(t.id) as count
      FROM ticket_types tt
      JOIN tickets t ON tt.id = t.ticket_type_id
      JOIN events e ON tt.event_id = e.id
      WHERE e.organizer_id = ? AND t.status != 'cancelled'
      GROUP BY tt.name
    `, [userId]);

        res.status(200).json({
            success: true,
            data: {
                total_events: eventStats[0].total_events || 0,
                total_bookings: bookingStats[0].total_bookings || 0,
                total_revenue: bookingStats[0].total_revenue || 0,
                total_attendees: attendeeStats[0].total_attendees || 0,
                per_event_stats: perEvent,
                bookings_timeline: bookingsTimeline,
                ticket_type_breakdown: ticketTypesDist
            }
        });

    } catch (err) {
        next(err);
    }
};

export const getAttendeeAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const [attended] = await pool.query(`
      SELECT COUNT(DISTINCT event_id) as count FROM tickets WHERE user_id = ? AND status = 'used'
    `, [userId]);

        const [upcoming] = await pool.query(`
      SELECT COUNT(DISTINCT t.event_id) as count 
      FROM tickets t 
      JOIN events e ON t.event_id = e.id 
      WHERE t.user_id = ? AND t.status = 'active' AND e.start_datetime > NOW()
    `, [userId]);

        const [spent] = await pool.query(`
      SELECT SUM(total_amount) as total FROM bookings WHERE user_id = ? AND status IN ('confirmed', 'completed')
    `, [userId]);

        const [favCategory] = await pool.query(`
      SELECT e.category, COUNT(*) as count 
      FROM events e 
      JOIN bookings b ON e.id = b.event_id 
      WHERE b.user_id = ? AND b.status IN ('confirmed', 'completed')
      GROUP BY e.category 
      ORDER BY count DESC 
      LIMIT 1
    `, [userId]);

        res.status(200).json({
            success: true,
            data: {
                events_attended: attended[0].count || 0,
                upcoming_events: upcoming[0].count || 0,
                total_spent: spent[0].total || 0,
                favorite_category: favCategory.length > 0 ? favCategory[0].category : 'None yet'
            }
        });

    } catch (err) {
        next(err);
    }
};
