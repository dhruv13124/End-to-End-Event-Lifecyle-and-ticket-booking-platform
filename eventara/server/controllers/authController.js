import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: parseInt(process.env.COOKIE_MAX_AGE || 604800000), // 7 days
    sameSite: 'lax'
};

export const register = async (req, res, next) => {
    try {
        const { full_name, email, password, role, phone, organization_name } = req.body;

        // Validate
        if (!full_name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
        }
        if (role && !['attendee', 'organizer'].includes(role)) {
            return res.status(400).json({ success: false, message: 'Invalid role selected' });
        }

        // Check if email taken
        const [existingUsers] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ success: false, message: 'Email is already taken' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        const [result] = await pool.query(
            `INSERT INTO users (full_name, email, password, role, phone, organization_name, is_verified) 
       VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
            [full_name, email, hashedPassword, role || 'attendee', phone || null, organization_name || null]
        );

        const userId = result.insertId;

        // Create welcome notification
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)`,
            [userId, 'Welcome to EVENTARA!', '🎉 Welcome to EVENTARA! Your account is ready.', 'system']
        );

        // Sign JWT
        const token = jwt.sign(
            { id: userId, email, role: role || 'attendee' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Set cookie
        res.cookie('eventara_token', token, COOKIE_OPTIONS);

        res.status(201).json({
            success: true,
            user: { id: userId, full_name, email, role: role || 'attendee' }
        });
    } catch (err) {
        next(err);
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        // Find user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const user = users[0];

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check banned
        if (user.is_banned) {
            return res.status(403).json({ success: false, message: 'Your account has been banned.' });
        }

        // Sign JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Set cookie
        res.cookie('eventara_token', token, COOKIE_OPTIONS);

        // Return user info minus password
        delete user.password;
        res.status(200).json({ success: true, user });
    } catch (err) {
        next(err);
    }
};

export const logout = (req, res) => {
    res.clearCookie('eventara_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    });
    res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export const getMe = async (req, res, next) => {
    try {
        const [users] = await pool.query(
            'SELECT id, full_name, email, role, phone, avatar_url, bio, organization_name, organization_logo, total_points, is_verified, created_at FROM users WHERE id = ?',
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, user: users[0] });
    } catch (err) {
        next(err);
    }
};
