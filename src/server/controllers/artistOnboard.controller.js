// server/controllers/artistOnboard.controller.js
const pool = require('../db').pool;
const path = require('path');

const UPLOADS_PREFIX = process.env.UPLOADS_PREFIX || '/uploads';

async function columnExists(table, column) {
  const [rows] = await pool.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
  return (rows && rows.length > 0);
}

exports.onboard = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const display_name = (req.body.display_name || req.body.displayName || '').trim();
    if (!display_name) return res.status(400).json({ error: 'Display name is required' });

    const bio = req.body.bio || null;
    let genres = null;
    if (req.body.genres) {
      try { genres = typeof req.body.genres === 'string' ? JSON.parse(req.body.genres) : req.body.genres; }
      catch (e) { genres = null; }
    }

    const district_id = req.body.district_id ? Number(req.body.district_id) : (req.body.district ? null : null);

    // photo URL
    let photo_url = null;
    if (req.file && req.file.filename) {
      photo_url = path.posix.join(UPLOADS_PREFIX, 'artist_photos', req.file.filename);
    }

    // Check existing by user_id
    const [existing] = await pool.query('SELECT id FROM artists WHERE user_id = ? LIMIT 1', [userId]);
    const hasGenresColumn = await columnExists('artists', 'genres');

    if (existing && existing.length > 0) {
      const artistId = existing[0].id;
      const updates = [];
      const vals = [];

      updates.push('display_name = ?'); vals.push(display_name);
      updates.push('bio = ?'); vals.push(bio);
      if (photo_url) { updates.push('photo_url = ?'); vals.push(photo_url); }
      if (district_id) { updates.push('district_id = ?'); vals.push(district_id); }
      if (hasGenresColumn && genres) { updates.push('genres = ?'); vals.push(JSON.stringify(genres)); }

      if (updates.length > 0) {
        vals.push(artistId);
        const sql = `UPDATE artists SET ${updates.join(', ')} WHERE id = ?`;
        await pool.query(sql, vals);
      }

      await pool.query('UPDATE users SET has_profile = 1, role = ? WHERE id = ?', ['artist', userId]);
      const [rows] = await pool.query('SELECT * FROM artists WHERE id = ? LIMIT 1', [artistId]);
      const artist = rows[0] || null;

      return res.json({ message: 'Artist profile updated', artist, photo_url: artist ? artist.photo_url : photo_url });
    } else {
      // Insert normal fields
      const fields = ['display_name', 'bio', 'photo_url', 'district_id', 'user_id'];
      const vals = [display_name, bio, photo_url, district_id, userId];

      if (hasGenresColumn && genres) {
        fields.splice(3, 0, 'genres'); // insert genres before photo_url position
        vals.splice(3, 0, JSON.stringify(genres));
      }

      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO artists (${fields.join(', ')}) VALUES (${placeholders})`;
      const [result] = await pool.query(sql, vals);

      await pool.query('UPDATE users SET has_profile = 1, role = ? WHERE id = ?', ['artist', userId]);

      const [rows] = await pool.query('SELECT * FROM artists WHERE id = ? LIMIT 1', [result.insertId]);
      const artist = rows[0] || null;

      return res.status(201).json({ message: 'Artist profile created', artist, photo_url: artist ? artist.photo_url : photo_url });
    }
  } catch (err) {
    console.error('Artist onboard error:', err);
    next(err);
  }
};

exports.getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const [rows] = await pool.query('SELECT * FROM artists WHERE user_id = ? LIMIT 1', [userId]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Artist profile not found' });
    const artist = rows[0];
    return res.json({ artist });
  } catch (err) {
    console.error('Get artist profile error:', err);
    next(err);
  }
};
