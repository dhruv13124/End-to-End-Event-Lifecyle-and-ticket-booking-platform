import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.eventara_token;

        if (!token) {
            return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user is banned
        const [rows] = await pool.query('SELECT is_banned FROM users WHERE id = ?', [decoded.id]);

        if (rows.length === 0) {
            return res.status(401).json({ success: false, message: 'User no longer exists.' });
        }
        if (rows[0].is_banned) {
            return res.status(403).json({ success: false, message: 'Your account has been banned. Please contact support.' });
        }

        req.user = decoded; // { id, email, role }
        next();
    } catch (err) {
        console.error('Auth error:', err.message);
        return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }
};

export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Access denied: You lack necessary permissions.' });
        }
        next();
    };
};

export const optionalAuth = async (req, res, next) => {
    try {
        const token = req.cookies.eventara_token;
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const [rows] = await pool.query('SELECT is_banned FROM users WHERE id = ?', [decoded.id]);
            if (rows.length > 0 && !rows[0].is_banned) {
                req.user = decoded;
            }
        } else {
            req.user = null;
        }
    } catch (err) {
        req.user = null;
    }
    next();
};
