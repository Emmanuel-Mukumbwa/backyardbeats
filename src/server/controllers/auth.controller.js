// src/server/controllers/auth.controller.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db').pool;

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

// 30-day window for recovery
const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function findUserBy(field, value) {
  const allowed = ['id', 'username', 'email'];
  if (!allowed.includes(field)) {
    throw new Error('Invalid lookup field');
  }

  const lookupValue = field === 'email' && typeof value === 'string' ? value.toLowerCase() : value;

  const [rows] = await pool.query(
    `SELECT id, username, email, password_hash, role, has_profile, banned, deleted_at
     FROM users
     WHERE ${field} = ?
     LIMIT 1`,
    [lookupValue]
  );
  return (rows && rows[0]) || null;
}

function daysLeftToRecover(deletedAt) {
  if (!deletedAt) return 0;
  const elapsed = Date.now() - new Date(deletedAt).getTime();
  const leftMs = RECOVERY_WINDOW_MS - elapsed;
  if (leftMs <= 0) return 0;
  return Math.ceil(leftMs / (24 * 60 * 60 * 1000)); // days remaining rounded up
}

// Register (creates a new user in users table)
exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role, district_id } = req.body;

    if (!username || !email || !password || !district_id) {
      return res.status(400).json({ error: 'Please fill in all required fields (username, email, password, district).' });
    }

    const [districtRows] = await pool.query('SELECT id FROM districts WHERE id = ? LIMIT 1', [district_id]);
    if (!districtRows || districtRows.length === 0) {
      return res.status(400).json({ error: 'Invalid district selected.' });
    }

    const uname = String(username).trim();
    if (uname.length < 3 || uname.length > 50) {
      return res.status(400).json({ error: 'Username must be 3-50 characters.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const [userByUsername] = await pool.query('SELECT id, deleted_at FROM users WHERE username = ? LIMIT 1', [uname]);
    if (userByUsername && userByUsername.length > 0) {
      const u = userByUsername[0];
      if (u.deleted_at) {
        return res.status(409).json({ error: 'This username is associated with a deleted account. Contact support to restore or choose another username.' });
      }
      return res.status(409).json({ error: 'Username already exists. Please choose another.' });
    }

    const [userByEmail] = await pool.query('SELECT id, deleted_at FROM users WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (userByEmail && userByEmail.length > 0) {
      const u = userByEmail[0];
      if (u.deleted_at) {
        return res.status(409).json({ error: 'This email is associated with a deleted account. Contact support to restore or use a different email.' });
      }
      return res.status(409).json({ error: 'Email already registered. Please log in or use a different email.' });
    }

    const finalRole = (role === 'artist') ? 'artist' : 'fan';

    const hash = await bcrypt.hash(password, 10);
    const insertSql = `INSERT INTO users (username, email, password_hash, role, has_profile, district_id) VALUES (?, ?, ?, ?, 0, ?)`;
    const [result] = await pool.query(insertSql, [uname, normalizedEmail, hash, finalRole, district_id]);

    const newUserId = result.insertId;
    return res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUserId,
        username: uname,
        email: normalizedEmail,
        role: finalRole,
        has_profile: false,
        district_id
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
    const { identifier, password } = req.body;
    const loginIdentifier = identifier || req.body.email || req.body.username;
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: 'Please enter your email/username and password.' });
    }

    const field = loginIdentifier.includes('@') ? 'email' : 'username';
    const lookupValue = field === 'email' ? String(loginIdentifier).trim().toLowerCase() : String(loginIdentifier).trim();

    const user = await findUserBy(field, lookupValue);

    if (!user) {
      return res.status(401).json({ error: 'Incorrect username/email or password.' });
    }

    // If account is banned, block login regardless
    if (user.banned) {
      return res.status(403).json({ error: 'This account has been banned. Contact support for assistance.' });
    }

    // Check password first
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect username/email or password.' });
    }

    // If account was deactivated, reactivate automatically if inside recovery window
    let reactivated = false;
    if (user.deleted_at) {
      const daysLeft = daysLeftToRecover(user.deleted_at);
      if (daysLeft > 0) {
        // Reactivate: clear deleted_at and deleted_by
        await pool.query('UPDATE users SET deleted_at = NULL, deleted_by = NULL WHERE id = ?', [user.id]);
        reactivated = true;
        // reflect change locally for returned user object
        user.deleted_at = null;
      } else {
        // Recovery window expired — refuse login
        return res.status(410).json({ error: 'This account has been deleted and cannot be recovered.' });
      }
    }

    // Generate JWT token with basic user info
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        has_profile: !!user.has_profile,
        banned: !!user.banned
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return res.json({
      message: reactivated ? 'Login successful — account reactivated' : 'Login successful',
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
    return res.json({ message: 'Logout successful' });
  } catch (err) {
    next(err);
  }
};

// Check authentication - expects auth.middleware to have set req.user
exports.checkAuth = async (req, res, next) => {
  try {
    if (req.user) {
      const user = await findUserBy('id', req.user.id);
      if (!user || user.deleted_at) return res.status(401).json({ error: 'Not authenticated' });
      if (user.banned) return res.status(403).json({ error: 'Account banned' });
      return res.json({ user: { id: user.id, username: user.username, email: user.email, role: user.role, has_profile: !!user.has_profile } });
    }
    return res.status(401).json({ error: 'Not authenticated' });
  } catch (err) {
    next(err);
  }
};