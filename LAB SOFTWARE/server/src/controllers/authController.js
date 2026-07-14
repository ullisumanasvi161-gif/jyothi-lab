const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auditLog = require('../utils/auditLogger');
const notificationService = require('../utils/notificationService');

const JWT_SECRET = process.env.JWT_SECRET || 'jyothi_lab_secret_key_2026';

// Store OTPs temporarily in memory: phone -> { otp, expires }
const otpStore = new Map();

const authController = {
  // Registers a new user (receptionist, technician, doctor, admin)
  register: async (req, res) => {
    try {
      const { name, phone, email, password, role } = req.body;
      
      if (!name || !phone || !password || !role) {
        return res.status(400).json({ error: 'Name, phone, password, and role are required.' });
      }

      // Check if user already exists
      const existingUser = await db.get('SELECT id FROM users WHERE phone = $1', [phone]);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this phone number already exists.' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await db.run(
        `INSERT INTO users (name, phone, email, password, role, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [name, phone, email || null, hashedPassword, role, 1]
      );

      // Audit log the registration
      await auditLog(req.user ? req.user.id : null, 'User Registered', `Registered user: ${name} (${role})`, req.ip);

      return res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Log in using Phone Number and Password
  login: async (req, res) => {
    try {
      const { phone, password, rememberMe } = req.body;

      if (!phone || !password) {
        return res.status(400).json({ error: 'Phone number and password are required.' });
      }

      const user = await db.get('SELECT * FROM users WHERE phone = $1', [phone]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid phone number or password.' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'This user account is suspended.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid phone number or password.' });
      }

      // Generate JWT Token
      const tokenExpiry = rememberMe ? '7d' : '24h';
      const token = jwt.sign(
        { id: user.id, name: user.name, phone: user.phone, role: user.role },
        JWT_SECRET,
        { expiresIn: tokenExpiry }
      );

      // Log the login to audits
      await auditLog(user.id, 'User Login', `User logged in from IP ${req.ip}`, req.ip);

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          role: user.role
        }
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Forgot password - sends mock OTP
  forgotPassword: async (req, res) => {
    try {
      const { phone } = req.body;
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required.' });
      }

      const user = await db.get('SELECT name FROM users WHERE phone = $1', [phone]);
      if (!user) {
        return res.status(404).json({ error: 'No user registered with this phone number.' });
      }

      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes from now

      otpStore.set(phone, { otp, expires });

      // Fetch settings for dynamic lab name
      const settingsRows = await db.query('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach((r) => { settings[r.key] = r.value; });
      const receiptHeader = settings.receipt_header ? JSON.parse(settings.receipt_header) : {};
      const labName = receiptHeader.labName || 'Jyothi Lab';

      // Simulate sending OTP via notification helper
      await notificationService.sendSMS(phone, `Your ${labName} OTP for password reset is ${otp}. Valid for 10 minutes.`);
      console.log(`[OTP] Generated OTP for ${phone}: ${otp}`);

      return res.json({ message: 'OTP sent to registered phone number.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  },

  // Verify OTP and reset password
  resetPassword: async (req, res) => {
    try {
      const { phone, otp, newPassword } = req.body;
      
      if (!phone || !otp || !newPassword) {
        return res.status(400).json({ error: 'Phone, OTP, and new password are required.' });
      }

      const record = otpStore.get(phone);
      if (!record) {
        return res.status(400).json({ error: 'No active OTP request found for this number.' });
      }

      if (record.expires < Date.now()) {
        otpStore.delete(phone);
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      if (record.otp !== otp) {
        return res.status(400).json({ error: 'Invalid OTP entered.' });
      }

      // OTP verified successfully
      otpStore.delete(phone);
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await db.run('UPDATE users SET password = $1 WHERE phone = $2', [hashedPassword, phone]);
      
      const user = await db.get('SELECT id FROM users WHERE phone = $1', [phone]);
      await auditLog(user.id, 'Password Reset', 'User reset password successfully via OTP', req.ip);

      return res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

module.exports = authController;
