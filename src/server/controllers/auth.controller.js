// server/controllers/auth.controller.js
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db').pool;

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// Register
exports.register = async (req, res, next) => {
  try { 
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please fill in all required fields.' });
    }

    // Check for existing username/email using Sequelize
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists. Please choose another.' });
    }

    const existingEmail = await User.findOne({ where: { email } });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already registered. Please log in or use a different email.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password_hash: hash,
      role: role || 'fan'
    });

    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        has_profile: !!user.has_profile
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    next(err);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    // Accept either email or username for login if you want; currently using email
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter your email and password.' });
    }

    const [rows] = await pool.query(
      `SELECT id, username, email, password_hash, role, has_profile
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'No account found for this email. Please check your email or register.' });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again or reset your password.' });
    }

    // Generate JWT token with user id and role (id key used)
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        has_profile: !!user.has_profile
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        has_profile: !!user.has_profile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
};

// Logout (stateless)
exports.logout = async (req, res, next) => {
  try {
    // Nothing server-side to do for JWT-based stateless logout.
    return res.json({ message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
};

// Check authentication - expects auth.middleware to have run
exports.checkAuth = async (req, res, next) => {
  try {
    if (req.user) {
      return res.json({ user: req.user });
    }
    return res.status(401).json({ error: 'Not authenticated' });
  } catch (err) {
    next(err);
  }
};
