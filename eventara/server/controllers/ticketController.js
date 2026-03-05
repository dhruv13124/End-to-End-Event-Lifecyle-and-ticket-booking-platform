import pool from '../config/db.js';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const getMyTickets = async (req, res, next) => {
    try {
        const query = `
      SELECT t.*, tt.name as ticket_type_name, tt.color,
      e.title as event_title, e.start_datetime, e.venue_name, e.banner_url
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN events e ON t.event_id = e.id
      WHERE t.user_id = ?
      ORDER BY e.start_datetime ASC
    `;
        const [tickets] = await pool.query(query, [req.user.id]);
        res.status(200).json({ success: true, data: tickets });
    } catch (err) {
        next(err);
    }
};

export const getTicketDetails = async (req, res, next) => {
    try {
        const { ticketCode } = req.params;
        const [tickets] = await pool.query(`
      SELECT t.*, tt.name as ticket_type_name, e.title as event_title, e.start_datetime, e.venue_name
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN events e ON t.event_id = e.id
      WHERE t.ticket_code = ?
    `, [ticketCode]);

        if (tickets.length === 0) return res.status(404).json({ success: false, message: 'Ticket not found' });

        // Auth
        if (tickets[0].user_id != req.user.id && !['organizer', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.status(200).json({ success: true, data: tickets[0] });
    } catch (err) {
        next(err);
    }
};

export const downloadTicket = async (req, res, next) => {
    try {
        const { ticketCode } = req.params;
        const [tickets] = await pool.query(`
      SELECT t.*, tt.name as ticket_type_name, tt.color, e.title as event_title, e.start_datetime, e.venue_name, e.venue_city
      FROM tickets t
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      JOIN events e ON t.event_id = e.id
      WHERE t.ticket_code = ?
    `, [ticketCode]);

        if (tickets.length === 0) return res.status(404).json({ success: false, message: 'Ticket not found' });
        const ticket = tickets[0];

        if (ticket.user_id != req.user.id && !['organizer', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        // PDF generation
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=EVENTARA_TICKET_${ticketCode}.pdf`);
        doc.pipe(res);

        // Dark Background
        doc.rect(0, 0, doc.page.width, doc.page.height).fill('#05050f');

        // Branding
        doc.font('Helvetica-Bold').fontSize(24).fillColor('#7c3aed').text('EVENTARA', 50, 50);
        doc.moveTo(50, 80).lineTo(545, 80).dash(5, { space: 5 }).strokeColor('#ffffff').stroke();

        // Event Info
        doc.undash().fillColor('#f1f5f9').fontSize(20).text(ticket.event_title, 50, 100);
        doc.fontSize(14).fillColor('#94a3b8')
            .text(`Date: ${new Date(ticket.start_datetime).toLocaleString()}`, 50, 130)
            .text(`Venue: ${ticket.venue_name}, ${ticket.venue_city || ''}`, 50, 150);

        // Ticket Details
        doc.rect(50, 180, 495, 120).fillColor('#12122a').fillAndStroke();
        doc.fillColor('#06b6d4').fontSize(16).text(ticket.ticket_type_name.toUpperCase(), 70, 200);
        doc.fillColor('#f1f5f9').fontSize(14).text(`Attendee: ${ticket.attendee_name}`, 70, 230);
        doc.text(`Ticket Code: ${ticket.ticket_code}`, 70, 260);

        const qrPathFull = path.join(process.cwd(), 'server', 'uploads', 'qrcodes', `${ticketCode}.png`);
        if (fs.existsSync(qrPathFull)) {
            doc.image(qrPathFull, 400, 190, { width: 100 });
        }

        doc.moveTo(50, 400).lineTo(545, 400).dash(5, { space: 5 }).strokeColor('rgba(255,255,255,0.2)').stroke();

        doc.end();

    } catch (err) {
        next(err);
    }
};

export const checkinTicket = async (req, res, next) => {
    try {
        const { ticketCode } = req.params;

        const [tickets] = await pool.query(`
      SELECT t.*, e.organizer_id, e.title as event_title, tt.name as ticket_type_name
      FROM tickets t 
      JOIN events e ON t.event_id = e.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.ticket_code = ?
            `, [ticketCode]);

        if (tickets.length === 0) return res.status(404).json({ success: false, message: 'Ticket not found' });
        const ticket = tickets[0];

        // Auth logic
        if (ticket.organizer_id != req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to scan this event' });
        }

        if (ticket.status !== 'active') {
            return res.status(400).json({ success: false, message: `Ticket is ${ticket.status}` });
        }

        // Mark used
        await pool.query("UPDATE tickets SET status = 'used', checked_in_at = NOW(), checked_in_by = ? WHERE id = ?", [req.user.id, ticket.id]);

        res.status(200).json({
            success: true,
            message: 'Check-in successful',
            attendee_name: ticket.attendee_name,
            ticket_type: ticket.ticket_type_name,
            event_title: ticket.event_title
        });

    } catch (err) {
        next(err);
    }
};

export const verifyTicketPublic = async (req, res, next) => {
    try {
        const { ticketCode } = req.params;
        const [tickets] = await pool.query(`
      SELECT t.status, t.attendee_name, t.ticket_code, tt.name as ticket_type_name, e.title as event_title
      FROM tickets t 
      JOIN events e ON t.event_id = e.id
      JOIN ticket_types tt ON t.ticket_type_id = tt.id
      WHERE t.ticket_code = ?
            `, [ticketCode]);

        if (tickets.length === 0) return res.status(404).json({ valid: false, message: 'Ticket not found' });

        const ticket = tickets[0];
        res.status(200).json({ valid: ticket.status === 'active', data: ticket });
    } catch (err) {
        next(err);
    }
};
