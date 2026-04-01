const pool = require('../db').pool;

// Exempt these routes from maintenance check (admin must be able to login, and status endpoint must be reachable)
const EXEMPT_PATHS = [
  '/auth/login',
  '/auth/register',
  '/health',
  '/api/maintenance-status'  // <-- added
];

module.exports = async (req, res, next) => {
  // Skip if path is exempt
  if (EXEMPT_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // If user is admin, allow
  if (req.user && req.user.role === 'admin') {
    return next();
  }

  try {
    const [rows] = await pool.query('SELECT maintenance_mode FROM site_settings WHERE id = 1');
    const maintenance = rows[0]?.maintenance_mode === 1;
    if (maintenance) {
      return res.status(503).json({ error: 'Site is under maintenance. Please check back later.' });
    }
    next();
  } catch (err) {
    // If DB error, proceed (no maintenance)
    next();
  }
};