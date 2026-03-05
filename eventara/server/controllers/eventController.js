import pool from '../config/db.js';
import slugify from 'slugify';

export const getEvents = async (req, res, next) => {
    try {
        const { category, format, city, search, status = 'published', sort = 'upcoming', page = 1, limit = 12, featured } = req.query;

        let query = `
      SELECT e.*, u.full_name as organizer_name, u.organization_name, u.organization_logo,
      (SELECT MIN(price) FROM ticket_types WHERE event_id = e.id AND is_active = TRUE) as min_price,
      (SELECT SUM(total_quantity) FROM ticket_types WHERE event_id = e.id AND is_active = TRUE) as total_capacity,
      (SELECT SUM(sold_quantity) FROM ticket_types WHERE event_id = e.id AND is_active = TRUE) as total_sold,
      (SELECT AVG(rating) FROM reviews WHERE event_id = e.id AND is_approved = TRUE) as avg_rating,
      (SELECT COUNT(id) FROM reviews WHERE event_id = e.id AND is_approved = TRUE) as total_reviews
    `;

        if (req.user) {
            query += `, (SELECT COUNT(*) FROM saved_events WHERE event_id = e.id AND user_id = ${pool.escape(req.user.id)}) > 0 as is_saved`;
        }

        query += ` FROM events e JOIN users u ON e.organizer_id = u.id WHERE 1=1`;

        const params = [];

        if (status !== 'all') {
            query += ` AND e.status = ?`;
            params.push(status);
        }
        if (category) {
            query += ` AND e.category = ?`;
            params.push(category);
        }
        if (format) {
            query += ` AND e.format = ?`;
            params.push(format);
        }
        if (city) {
            query += ` AND (e.venue_city LIKE ? OR e.venue_address LIKE ?)`;
            params.push(`%${city}%`, `%${city}%`);
        }
        if (search) {
            query += ` AND (e.title LIKE ? OR e.tagline LIKE ? OR e.tags LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (featured === 'true') {
            query += ` AND e.is_featured = TRUE`;
        }

        if (sort === 'upcoming') {
            query += ` ORDER BY e.start_datetime ASC`;
        } else if (sort === 'newest') {
            query += ` ORDER BY e.created_at DESC`;
        } else if (sort === 'popular') {
            query += ` ORDER BY total_sold DESC`;
        } else if (sort === 'rating') {
            query += ` ORDER BY avg_rating DESC`;
        }

        // Pagination
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count
        const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM (${query}) as subquery`, params);
        const total = countRows[0].total;

        query += ` LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const [events] = await pool.query(query, params);

        res.status(200).json({
            success: true,
            data: events,
            meta: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (err) {
        next(err);
    }
};

export const getFeaturedEvents = async (req, res, next) => {
    try {
        const query = `
      SELECT e.*, u.full_name as organizer_name, u.organization_name, u.organization_logo,
      (SELECT MIN(price) FROM ticket_types WHERE event_id = e.id AND is_active = TRUE) as min_price
      FROM events e 
      JOIN users u ON e.organizer_id = u.id 
      WHERE e.is_featured = TRUE 
      AND e.status = 'published' 
      AND e.start_datetime > NOW()
      ORDER BY e.start_datetime ASC
      LIMIT 6
    `;
        const [events] = await pool.query(query);
        res.status(200).json({ success: true, data: events });
    } catch (err) {
        next(err);
    }
};

export const getManagedEvents = async (req, res, next) => {
    try {
        if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const query = `
          SELECT e.*, 
          (SELECT COUNT(*) FROM ticket_types WHERE event_id = e.id AND is_active = TRUE) as ticket_types_count,
          (SELECT COALESCE(SUM(total_amount), 0) FROM bookings WHERE event_id = e.id AND status = 'confirmed') as total_revenue
          FROM events e
          WHERE e.organizer_id = ?
          ORDER BY e.created_at DESC
        `;

        const [events] = await pool.query(query, [req.user.id]);
        res.status(200).json({ success: true, data: events });
    } catch (err) {
        next(err);
    }
};

export const getEventBySlug = async (req, res, next) => {
    try {
        const { slug } = req.params;

        let query = `
      SELECT e.*, u.full_name as organizer_name, u.organization_name, u.organization_logo, u.bio as organizer_bio,
      (SELECT AVG(rating) FROM reviews WHERE event_id = e.id AND is_approved = TRUE) as avg_rating,
      (SELECT COUNT(id) FROM reviews WHERE event_id = e.id AND is_approved = TRUE) as total_reviews
    `;

        if (req.user) {
            query += `, 
      (SELECT COUNT(*) FROM saved_events WHERE event_id = e.id AND user_id = ${pool.escape(req.user.id)}) > 0 as is_saved,
      (SELECT COUNT(*) FROM bookings WHERE event_id = e.id AND user_id = ${pool.escape(req.user.id)} AND status IN ('pending', 'confirmed')) > 0 as is_booked
      `;
        }

        query += ` FROM events e JOIN users u ON e.organizer_id = u.id WHERE e.slug = ?`;

        const [events] = await pool.query(query, [slug]);

        if (events.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        const event = events[0];

        // Get ticket types
        const [ticketTypes] = await pool.query('SELECT * FROM ticket_types WHERE event_id = ? AND is_active = TRUE', [event.id]);

        // Calculate availability logic
        ticketTypes.forEach(t => {
            t.available_quantity = t.total_quantity - t.sold_quantity;
            if (t.perks) {
                try { t.perks = JSON.parse(t.perks); } catch (e) { t.perks = []; }
            }
        });
        event.ticket_types = ticketTypes;

        // Get recent 5 reviews
        const [reviews] = await pool.query(`
      SELECT r.*, u.full_name as user_name, u.avatar_url 
      FROM reviews r JOIN users u ON r.user_id = u.id 
      WHERE r.event_id = ? AND r.is_approved = TRUE 
      ORDER BY r.created_at DESC LIMIT 5`, [event.id]);

        event.recent_reviews = reviews;

        res.status(200).json({ success: true, data: event });

    } catch (err) {
        next(err);
    }
};

export const createEvent = async (req, res, next) => {
    try {
        const { title, tagline, description, category, format, venue_name, venue_address, venue_city, virtual_link, start_datetime, end_datetime, registration_deadline, min_age, tags } = req.body;

        if (!title || !description || !category || !start_datetime || !end_datetime) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        let slug = slugify(title, { lower: true, strict: true });
        // Ensure slug unique
        const [existing] = await pool.query('SELECT id FROM events WHERE slug = ?', [slug]);
        if (existing.length > 0) {
            slug = `${slug}-${Date.now()}`;
        }

        let banner_url = null;
        if (req.file) {
            banner_url = `/uploads/banners/${req.file.filename}`;
        }

        const query = `
      INSERT INTO events 
      (slug, title, tagline, description, category, format, banner_url, venue_name, venue_address, venue_city, virtual_link, start_datetime, end_datetime, registration_deadline, organizer_id, status, min_age, tags) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `;

        const [result] = await pool.query(query, [
            slug,
            title,
            tagline || null,
            description,
            category,
            format || 'in-person',
            banner_url || null,
            venue_name || null,
            venue_address || null,
            venue_city || null,
            virtual_link || null,
            start_datetime,
            end_datetime,
            registration_deadline || start_datetime,
            req.user.id,
            min_age || 0,
            tags || null
        ]);

        res.status(201).json({ success: true, eventId: result.insertId, slug, message: 'Event created as draft' });
    } catch (err) {
        next(err);
    }
};

export const updateEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, tagline, description, category, format, venue_name, venue_address, venue_city, virtual_link, start_datetime, end_datetime, registration_deadline, min_age, tags } = req.body;

        const [events] = await pool.query('SELECT organizer_id, slug, title FROM events WHERE id = ?', [id]);
        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });

        if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this event' });
        }

        let slug = events[0].slug;
        if (title && title !== events[0].title) {
            slug = slugify(title, { lower: true, strict: true });
            const [existing] = await pool.query('SELECT id FROM events WHERE slug = ? AND id != ?', [slug, id]);
            if (existing.length > 0) slug = `${slug}-${Date.now()}`;
        }

        const updates = {
            slug, title, tagline, description, category, format, venue_name, venue_address, venue_city,
            virtual_link, start_datetime, end_datetime, registration_deadline, min_age, tags
        };

        let query = 'UPDATE events SET ';
        const params = [];
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                query += `${key} = ?, `;
                params.push(updates[key]);
            }
        });

        if (req.file) {
            query += `banner_url = ?, `;
            params.push(`/uploads/banners/${req.file.filename}`);
        }

        // Remove last comma and space
        query = query.slice(0, -2);
        query += ` WHERE id = ?`;
        params.push(id);

        await pool.query(query, params);

        res.status(200).json({ success: true, slug, message: 'Event updated successfully' });
    } catch (err) {
        next(err);
    }
};

export const publishEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [events] = await pool.query('SELECT status, organizer_id FROM events WHERE id = ?', [id]);

        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const newStatus = events[0].status === 'published' ? 'draft' : 'published';
        await pool.query('UPDATE events SET status = ? WHERE id = ?', [newStatus, id]);

        res.status(200).json({ success: true, message: `Event status changed to ${newStatus}` });
    } catch (err) {
        next(err);
    }
};

export const cancelEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [events] = await pool.query('SELECT title, organizer_id FROM events WHERE id = ?', [id]);

        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const connection = await pool.getConnection();
        await connection.beginTransaction();

        try {
            await connection.query("UPDATE events SET status = 'cancelled' WHERE id = ?", [id]);

            // Cancel active bookings temporarily avoiding full refund gateway complexity here but setting statuses
            const [bookings] = await connection.query("SELECT id, user_id, booking_ref FROM bookings WHERE event_id = ? AND status IN ('pending', 'confirmed')", [id]);

            if (bookings.length > 0) {
                await connection.query("UPDATE bookings SET status = 'cancelled', payment_status = 'refunded' WHERE event_id = ? AND status IN ('pending', 'confirmed')", [id]);
                await connection.query("UPDATE tickets SET status = 'cancelled' WHERE event_id = ? AND status = 'active'", [id]);

                // Notify
                for (const b of bookings) {
                    await connection.query(
                        "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'system')",
                        [b.user_id, 'Event Cancelled', `❌ Event Cancelled: ${events[0].title}. Booking ${b.booking_ref} has been cancelled and refunded.`]
                    );
                }
            }

            await connection.commit();
            res.status(200).json({ success: true, message: 'Event cancelled. Attendees notified.' });
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    } catch (err) {
        next(err);
    }
};

export const featureEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [events] = await pool.query('SELECT is_featured FROM events WHERE id = ?', [id]);

        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });

        const newFeatured = !events[0].is_featured;
        await pool.query('UPDATE events SET is_featured = ? WHERE id = ?', [newFeatured, id]);

        res.status(200).json({ success: true, message: `Event feature status set to ${newFeatured}` });
    } catch (err) {
        next(err);
    }
};

export const deleteEvent = async (req, res, next) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM events WHERE id = ?', [id]);
        res.status(200).json({ success: true, message: 'Event deleted completely' });
    } catch (err) {
        next(err);
    }
};

// --- Ticket Types ---

export const getTicketTypes = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const [types] = await pool.query('SELECT * FROM ticket_types WHERE event_id = ? AND is_active = TRUE', [eventId]);
        types.forEach(t => {
            if (t.perks) { try { t.perks = JSON.parse(t.perks); } catch (e) { t.perks = []; } }
        });
        res.status(200).json({ success: true, data: types });
    } catch (err) {
        next(err);
    }
};

export const createTicketType = async (req, res, next) => {
    try {
        const { eventId } = req.params;
        const { name, description, price, total_quantity, max_per_booking, sale_start, sale_end, perks, color } = req.body;

        // Check auth
        const [events] = await pool.query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const perksJson = Array.isArray(perks) ? JSON.stringify(perks) : "[]";

        const [result] = await pool.query(`
      INSERT INTO ticket_types (event_id, name, description, price, total_quantity, max_per_booking, sale_start, sale_end, perks, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [eventId, name, description || null, price || 0, total_quantity, max_per_booking || 10, sale_start || null, sale_end || null, perksJson, color || '#7c3aed']);

        res.status(201).json({ success: true, ticketTypeId: result.insertId, message: 'Ticket type created' });
    } catch (err) {
        next(err);
    }
};

export const updateTicketType = async (req, res, next) => {
    try {
        const { eventId, typeId } = req.params;
        const { name, description, price, total_quantity, max_per_booking, sale_start, sale_end, perks, color, is_active } = req.body;

        // Check auth
        const [events] = await pool.query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const perksJson = Array.isArray(perks) ? JSON.stringify(perks) : undefined;

        const updates = { name, description, price, total_quantity, max_per_booking, sale_start, sale_end, perks: perksJson, color, is_active };

        let query = 'UPDATE ticket_types SET ';
        const params = [];
        Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined) {
                query += `${key} = ?, `;
                params.push(updates[key]);
            }
        });
        query = query.slice(0, -2);
        query += ` WHERE id = ? AND event_id = ?`;
        params.push(typeId, eventId);

        await pool.query(query, params);

        res.status(200).json({ success: true, message: 'Ticket type updated' });
    } catch (err) {
        next(err);
    }
};

export const deleteTicketType = async (req, res, next) => {
    try {
        const { eventId, typeId } = req.params;
        const [events] = await pool.query('SELECT organizer_id FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        if (events[0].organizer_id !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const [types] = await pool.query('SELECT sold_quantity FROM ticket_types WHERE id = ? AND event_id = ?', [typeId, eventId]);
        if (types.length === 0) return res.status(404).json({ success: false, message: 'Ticket type not found' });

        if (types[0].sold_quantity > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete a ticket type that has already been sold. Please set is_active = false instead.' });
        }

        await pool.query('DELETE FROM ticket_types WHERE id = ? AND event_id = ?', [typeId, eventId]);

        res.status(200).json({ success: true, message: 'Ticket type deleted' });
    } catch (err) {
        next(err);
    }
};
