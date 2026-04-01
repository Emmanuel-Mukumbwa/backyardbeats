const jwt = require('jsonwebtoken');
const pool = require('../db').pool;
const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return next(); // ignore invalid token
    }

    const userId = decoded.id || decoded.userId;
    if (!userId) {
      return next();
    }

    const [rows] = await pool.query(
      `SELECT id, username, email, role, has_profile, banned, deleted_at FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (rows && rows[0]) {
      req.user = rows[0];
    }
    next();
  } catch (err) {
    next();
  }
};