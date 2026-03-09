// src/server/controllers/favorites.controller.js
const pool = require('../db').pool;

/**
 * Favorites controller (user follows artists)
 *
 * Table: favorites (id, user_id, artist_id, created_at)
 *
 * Exports:
 * - getUserFavorites(req, res)
 * - addFavorite(req, res)
 * - removeFavorite(req, res)
 * - checkFavorite(req, res)
 */

exports.getUserFavorites = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    // Return artist metadata useful for the fan dashboard:
    // - track_count (subquery from tracks)
    // - district name (left join districts)
    // - avg_rating, follower_count, has_upcoming_event from artists table
    // - followed_at (when the fan followed the artist)
    const sql = `
      SELECT
        a.id,
        a.display_name,
        a.photo_url,
        a.user_id,
        a.avg_rating,
        a.follower_count,
        a.has_upcoming_event,
        d.name AS district,
        (SELECT COUNT(*) FROM tracks t WHERE t.artist_id = a.id) AS track_count,
        f.created_at AS followed_at
      FROM favorites f
      JOIN artists a ON f.artist_id = a.id
      LEFT JOIN districts d ON a.district_id = d.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
      LIMIT 200
    `;

    const [rows] = await pool.query(sql, [userId]);

    const result = (rows || []).map(r => ({
      id: r.id,
      display_name: r.display_name,
      photo_url: r.photo_url, // stored path e.g. /uploads/artists/photos/img-9-... or uploads/...
      user_id: r.user_id,
      avg_rating: r.avg_rating !== null ? Number(r.avg_rating) : null,
      follower_count: r.follower_count !== null ? Number(r.follower_count) : 0,
      has_upcoming_event: !!r.has_upcoming_event,
      district: r.district || null,
      track_count: r.track_count !== null ? Number(r.track_count) : 0,
      followed_at: r.followed_at ? new Date(r.followed_at).toISOString() : null
    }));

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.addFavorite = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const artistId = Number(req.body.artist_id || req.body.id);
    if (!artistId) return res.status(400).json({ error: 'artist_id is required' });

    // Ensure artist exists
    const [aRows] = await pool.query('SELECT id FROM artists WHERE id = ? LIMIT 1', [artistId]);
    if (!aRows || aRows.length === 0) return res.status(404).json({ error: 'Artist not found' });

    // Try to insert (ignore duplicates)
    try {
      await pool.query('INSERT INTO favorites (user_id, artist_id) VALUES (?, ?)', [userId, artistId]);
    } catch (e) {
      // if duplicate (unique constraint) -> return 200 with message
      if (e && e.code === 'ER_DUP_ENTRY') {
        return res.status(200).json({ message: 'Already following' });
      }
      throw e;
    }

    // Optionally update cached follower_count on artists (if column exists)
    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM artists LIKE ?', ['follower_count']);
      if (cols && cols.length) {
        await pool.query('UPDATE artists SET follower_count = (SELECT COUNT(*) FROM favorites WHERE artist_id = ?) WHERE id = ?', [artistId, artistId]);
      }
    } catch (e) {
      // non-fatal
      console.warn('Could not update artists.follower_count:', e.message || e);
    }

    return res.status(201).json({ message: 'Followed', artist_id: artistId });
  } catch (err) {
    next(err);
  }
};

exports.removeFavorite = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const artistId = Number(req.params.artistId);
    if (!artistId) return res.status(400).json({ error: 'Invalid artist id' });

    await pool.query('DELETE FROM favorites WHERE user_id = ? AND artist_id = ?', [userId, artistId]);

    // update cached follower_count if present
    try {
      const [cols] = await pool.query('SHOW COLUMNS FROM artists LIKE ?', ['follower_count']);
      if (cols && cols.length) {
        await pool.query('UPDATE artists SET follower_count = (SELECT COUNT(*) FROM favorites WHERE artist_id = ?) WHERE id = ?', [artistId, artistId]);
      }
    } catch (e) {
      console.warn('Could not update artists.follower_count:', e.message || e);
    }

    return res.json({ message: 'Unfollowed', artist_id: artistId });
  } catch (err) {
    next(err);
  }
};

exports.checkFavorite = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const artistId = Number(req.params.artistId);
    if (!artistId) return res.status(400).json({ error: 'Invalid artist id' });

    if (!userId) return res.json({ following: false });

    const [rows] = await pool.query('SELECT 1 FROM favorites WHERE user_id = ? AND artist_id = ? LIMIT 1', [userId, artistId]);
    return res.json({ following: !!(rows && rows.length) });
  } catch (err) {
    next(err);
  }
};