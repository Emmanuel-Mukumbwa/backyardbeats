// src/server/controllers/ratings.controller.js
const pool = require('../db').pool;

/**
 * Ratings controller tailored for your schema:
 * ratings table columns: id, artist_id, user_id, rating, comment, created_at
 * Returns normalized objects:
 * { id, stars, comment, reviewerName, createdAt }
 */

exports.getRatingsForArtist = async (req, res, next) => {
  try {
    const artistId = Number(req.params.id);
    if (!artistId) return res.status(400).json({ error: 'Invalid artist id' });

    const sql = `
      SELECT r.id, r.rating AS stars, r.comment, r.created_at, u.username AS reviewerName
      FROM ratings r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.artist_id = ?
      ORDER BY r.created_at DESC
      LIMIT 500
    `;

    const [rows] = await pool.query(sql, [artistId]);

    const normalized = (rows || []).map(r => ({
      id: r.id,
      stars: r.stars !== null && r.stars !== undefined ? Number(r.stars) : null,
      comment: r.comment ?? null,
      reviewerName: r.reviewerName || 'Anonymous',
      createdAt: r.created_at || null
    }));

    return res.json(normalized);
  } catch (err) {
    console.error('Ratings controller error:', err);
    next(err);
  }
};
