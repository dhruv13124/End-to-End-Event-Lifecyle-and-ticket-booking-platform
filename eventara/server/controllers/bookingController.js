import pool from '../config/db.js';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const generateBookingRef = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let ref = 'EVT-';
    for (let i = 0; i < 6; i++) {
        ref += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ref;
};

export const createBooking = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const { event_id, items, coupon_code, payment_method, attendees } = req.body;

        await connection.beginTransaction();

        // Validate Event
        const [events] = await connection.query('SELECT status, registration_deadline FROM events WHERE id = ?', [event_id]);
        if (events.length === 0 || events[0].status !== 'published') {
            throw new Error('Event is not available for booking');
        }
        if (events[0].registration_deadline && new Date(events[0].registration_deadline) < new Date()) {
            throw new Error('Registration deadline has passed');
        }

        let total_amount = 0;
        let expectedAttendeesCount = 0;

        // Validate items and calculate total
        for (const item of items) {
            const { ticket_type_id, quantity } = item;
            expectedAttendeesCount += quantity;

            const [ticketTypes] = await connection.query('SELECT * FROM ticket_types WHERE id = ? AND event_id = ? AND is_active = TRUE FOR UPDATE', [ticket_type_id, event_id]);

            if (ticketTypes.length === 0) throw new Error(`Invalid ticket type: ${ticket_type_id}`);

            const ticketType = ticketTypes[0];
            if (quantity > ticketType.max_per_booking) throw new Error(`Maximum ${ticketType.max_per_booking} allowed per booking for ${ticketType.name}`);
            if (ticketType.total_quantity - ticketType.sold_quantity < quantity) throw new Error(`Not enough tickets available for ${ticketType.name}`);

            total_amount += (quantity * ticketType.price);
        }

        if (attendees.length !== expectedAttendeesCount) {
            throw new Error(`Expected ${expectedAttendeesCount} attendees details, but got ${attendees.length}`);
        }

        // Handle coupon (Simplified)
        let discount_amount = 0;
        if (coupon_code) {
            const [coupons] = await connection.query('SELECT * FROM coupons WHERE code = ? AND is_active = TRUE AND (event_id IS NULL OR event_id = ?)', [coupon_code, event_id]);
            if (coupons.length > 0) {
                const coupon = coupons[0];
                if (coupon.used_count < coupon.max_uses && total_amount >= coupon.min_booking_amount) {
                    if (coupon.discount_type === 'percent') {
                        discount_amount = total_amount * (coupon.discount_value / 100);
                    } else {
                        discount_amount = coupon.discount_value;
                    }
                    await connection.query('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [coupon.id]);
                }
            }
        }

        const final_amount = Math.max(0, total_amount - discount_amount);
        const booking_ref = generateBookingRef();
        const paymentStatus = payment_method === 'free' || final_amount === 0 ? 'paid' : 'paid';
        // Simplified payment handling assuming paid immediately for demo

        // Insert Booking
        const [bookingResult] = await connection.query(`
      INSERT INTO bookings (booking_ref, user_id, event_id, status, total_amount, payment_method, payment_status, coupon_code, discount_amount)
      VALUES (?, ?, ?, 'confirmed', ?, ?, ?, ?, ?)
    `, [booking_ref, req.user.id, event_id, final_amount, payment_method || 'free', paymentStatus, coupon_code || null, discount_amount]);

        const bookingId = bookingResult.insertId;

        let attendeeIndex = 0;
        const allTickets = [];

        // Insert Items and Tickets
        for (const item of items) {
            const { ticket_type_id, quantity } = item;
            const [ticketTypes] = await connection.query('SELECT price FROM ticket_types WHERE id = ?', [ticket_type_id]);
            const price = ticketTypes[0].price;
            const subtotal = price * quantity;

            await connection.query(`
        INSERT INTO booking_items (booking_id, ticket_type_id, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `, [bookingId, ticket_type_id, quantity, price, subtotal]);

            // Update total sold
            await connection.query('UPDATE ticket_types SET sold_quantity = sold_quantity + ? WHERE id = ?', [quantity, ticket_type_id]);

            // Generate Tickets
            for (let i = 0; i < quantity; i++) {
                const attendee = attendees[attendeeIndex++];
                const ticket_code = 'TKT-' + uuidv4().substring(0, 12).toUpperCase();

                // Generate QR code
                const qrContent = JSON.stringify({ ticket_code, event_id });
                const qrFilename = `${ticket_code}.png`;
                const qrPathFull = path.join(process.cwd(), 'server', 'uploads', 'qrcodes', qrFilename);

                await QRCode.toFile(qrPathFull, qrContent, {
                    color: { dark: '#05050f', light: '#ffffff' }
                });

                const qr_code_url = `/uploads/qrcodes/${qrFilename}`;

                await connection.query(`
          INSERT INTO tickets (ticket_code, booking_id, ticket_type_id, user_id, event_id, attendee_name, attendee_email, qr_code_url, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `, [ticket_code, bookingId, ticket_type_id, req.user.id, event_id, attendee.name, attendee.email, qr_code_url]);

                allTickets.push({ ticket_code, attendee_name: attendee.name, qr_code_url });
            }
        }

        // Notification
        const [eventRow] = await connection.query('SELECT title FROM events WHERE id = ?', [event_id]);
        await connection.query(`
      INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'booking')
    `, [req.user.id, 'Booking Confirmed!', `🎟️ Booking Confirmed! ${eventRow[0].title} — Ref: ${booking_ref}`]);

        await connection.commit();

        res.status(201).json({
            success: true,
            booking: { id: bookingId, booking_ref, final_amount },
            tickets: allTickets
        });

    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
};

export const getMyBookings = async (req, res, next) => {
    try {
        const query = `
      SELECT b.*, e.title as event_title, e.start_datetime as event_date, e.banner_url,
      (SELECT COUNT(*) FROM tickets WHERE booking_id = b.id) as ticket_count
      FROM bookings b
      JOIN events e ON b.event_id = e.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `;
        const [bookings] = await pool.query(query, [req.user.id]);
        res.status(200).json({ success: true, data: bookings });
    } catch (err) {
        next(err);
    }
};

export const getBookingDetails = async (req, res, next) => {
    try {
        const { bookingRef } = req.params;
        const [bookings] = await pool.query(`
      SELECT b.*, e.title as event_title, e.start_datetime as event_date, e.venue_name, e.banner_url
      FROM bookings b JOIN events e ON b.event_id = e.id WHERE b.booking_ref = ?
    `, [bookingRef]);

        if (bookings.length === 0) return res.status(404).json({ success: false, message: 'Booking not found' });

        const booking = bookings[0];

        // Auth check
        if (booking.user_id !== req.user.id && req.user.role !== 'admin' && req.user.role !== 'organizer') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const [tickets] = await pool.query(`
      SELECT t.*, tt.name as ticket_type_name, tt.color 
      FROM tickets t JOIN ticket_types tt ON t.ticket_type_id = tt.id 
      WHERE t.booking_id = ?
    `, [booking.id]);

        booking.tickets = tickets;

        res.status(200).json({ success: true, data: booking });
    } catch (err) {
        next(err);
    }
};

export const cancelBooking = async (req, res, next) => {
    const connection = await pool.getConnection();
    try {
        const { bookingId } = req.params;

        await connection.beginTransaction();

        const [bookings] = await connection.query('SELECT * FROM bookings WHERE id = ?', [bookingId]);
        if (bookings.length === 0) throw new Error('Booking not found');

        const booking = bookings[0];
        if (booking.user_id !== req.user.id) throw new Error('Not authorized');
        if (booking.status !== 'confirmed' && booking.status !== 'pending') throw new Error('Cannot cancel this booking');

        // Update statuses
        await connection.query("UPDATE bookings SET status = 'cancelled', payment_status = 'refunded' WHERE id = ?", [bookingId]);
        await connection.query("UPDATE tickets SET status = 'cancelled' WHERE booking_id = ?", [bookingId]);

        // Restore sold_quantity
        const [items] = await connection.query('SELECT * FROM booking_items WHERE booking_id = ?', [bookingId]);
        for (const item of items) {
            await connection.query('UPDATE ticket_types SET sold_quantity = sold_quantity - ? WHERE id = ?', [item.quantity, item.ticket_type_id]);
        }

        // Notification
        await connection.query(`
      INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, 'refund')
    `, [req.user.id, 'Booking Cancelled', `🔄 Booking Cancelled & Refunded — ${booking.booking_ref}`]);

        await connection.commit();
        res.status(200).json({ success: true, message: 'Booking cancelled successfully' });
    } catch (err) {
        await connection.rollback();
        next(err);
    } finally {
        connection.release();
    }
};
