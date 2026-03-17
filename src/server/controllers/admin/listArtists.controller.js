// src/server/controllers/admin/listArtists.controller.js
const pool = require('../../db').pool;

/**
 * GET /admin/artists
 * Returns a list of all artists (id, display_name) for admin dropdowns.
 */
exports.listArtists = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, display_name FROM artists ORDER BY display_name`
    );
    res.json({ artists: rows });
  } catch (err) {
    next(err);
  }
};