require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Database opening error: ', err);
    else console.log('Connected to SQLite Database');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE,
        password TEXT,
        is_verified INTEGER DEFAULT 0,
        otp TEXT,
        otp_expiry INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const JWT_SECRET = process.env.JWT_SECRET || 'f8prime_super_secret_key_2026';

// 1. Register API (Send OTP)
app.post('/auth/register', async (req, res) => {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: 'Email, username and password required' });

    // Validate username (no spaces, no accents)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Username must not contain spaces or special characters' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP();
        const otp_expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Check if username already exists for a verified user
        db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, row) => {
            if (row && row.is_verified) {
                if (row.username === username) return res.status(400).json({ error: 'Username already taken' });
                return res.status(400).json({ error: 'Email already registered and verified' });
            }

            const query = row 
                ? 'UPDATE users SET username = ?, password = ?, otp = ?, otp_expiry = ? WHERE email = ?'
                : 'INSERT INTO users (email, username, password, otp, otp_expiry) VALUES (?, ?, ?, ?, ?)';
            const params = row ? [username, hashedPassword, otp, otp_expiry, email] : [email, username, hashedPassword, otp, otp_expiry];

            db.run(query, params, function(err) {
                if (err) return res.status(500).json({ error: 'Database error (username may be taken)' });
                
                // Send email
                if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
                    const mailOptions = {
                        from: `"F8 PRIME Server" <${process.env.GMAIL_USER}>`,
                        to: email,
                        subject: 'Your F8 PRIME Verification Code',
                        text: `Your verification code is: ${otp}. It will expire in 10 minutes.`,
                        html: `<h3>Welcome to F8 PRIME!</h3><p>Your verification code is: <b>${otp}</b>.</p><p>It will expire in 10 minutes.</p>`
                    };

                    transporter.sendMail(mailOptions, (error, info) => {
                        if (error) {
                            console.error('Error sending email', error);
                            return res.status(500).json({ error: 'Failed to send OTP email' });
                        }
                        res.json({ message: 'OTP sent to email', success: true });
                    });
                } else {
                    // For testing without email credentials
                    console.log(`[DEBUG] OTP for ${email} is ${otp}`);
                    res.json({ message: 'OTP generated (Check console since email is not configured)', success: true });
                }
            });
        });
    } catch (e) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// 2. Verify OTP API
app.post('/auth/verify', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'User not found' });
        
        if (user.is_verified) return res.status(400).json({ error: 'User already verified' });

        if (user.otp !== otp) return res.status(400).json({ error: 'Invalid OTP' });
        
        if (Date.now() > user.otp_expiry) return res.status(400).json({ error: 'OTP expired' });

        db.run('UPDATE users SET is_verified = 1, otp = NULL, otp_expiry = NULL WHERE email = ?', [email], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
            res.json({ message: 'Account verified successfully', success: true, token });
        });
    });
});

// 3. Login API
app.post('/auth/login', (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required' });

    db.get('SELECT * FROM users WHERE email = ? OR username = ?', [identifier, identifier], async (err, user) => {
        if (err || !user) return res.status(400).json({ error: 'Invalid credentials' });
        
        if (!user.is_verified) return res.status(400).json({ error: 'Account not verified. Please register again to get OTP.' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ message: 'Login successful', success: true, token, username: user.username });
    });
});

// 4. Verify Token API
app.post('/auth/check', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'No token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, user: decoded });
    } catch(e) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});

// 5. Change Password API
app.post('/auth/change-password', async (req, res) => {
    const { token, oldPassword, newPassword } = req.body;
    if (!token || !oldPassword || !newPassword) return res.status(400).json({ error: 'Missing fields' });
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        db.get('SELECT * FROM users WHERE id = ?', [decoded.id], async (err, user) => {
            if (err || !user) return res.status(400).json({ error: 'User not found' });
            
            const match = await bcrypt.compare(oldPassword, user.password);
            if (!match) return res.status(400).json({ error: 'Mật khẩu cũ không chính xác' });

            const hashedNewPassword = await bcrypt.hash(newPassword, 10);
            db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, decoded.id], (err) => {
                if (err) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, message: 'Đổi mật khẩu thành công!' });
            });
        });
    } catch (e) {
        res.status(401).json({ success: false, error: 'Invalid token' });
    }
});


const PORT = process.env.PORT || 3030;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`F8 PRIME Auth Backend running on port ${PORT}`);
});
