// server/controllers/artistOnboard.controller.js
const pool = require('../db').pool;
const path = require('path');

const UPLOADS_PREFIX = process.env.UPLOADS_PREFIX || '/uploads';

async function columnExists(table, column) {
  const [rows] = await pool.query('SHOW COLUMNS FROM ?? LIKE ?', [table, column]);
  return (rows && rows.length > 0);
}

function buildPhotoUrl(filename) {
  if (!filename) return null;
  return path.posix.join(UPLOADS_PREFIX, 'artists', 'photos', filename);
}

exports.onboard = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const display_name = (req.body.display_name || req.body.displayName || '').trim();
    if (!display_name) return res.status(400).json({ error: 'Display name is required' });

    const bio = (typeof req.body.bio === 'string' && req.body.bio.trim().length > 0) ? req.body.bio.trim() : null;

    // parse genres: accept array or JSON string
    let genres = null;
    if (req.body.genres) {
      try {
        genres = typeof req.body.genres === 'string' ? JSON.parse(req.body.genres) : req.body.genres;
        // ensure it's an array or null
        if (!Array.isArray(genres)) genres = null;
      } catch (e) {
        genres = null;
      }
    }

    // district_id parsing: accept numeric id if provided, otherwise null
    let district_id = null;
    if (req.body.district_id !== undefined && req.body.district_id !== null && String(req.body.district_id).trim() !== '') {
      const n = Number(req.body.district_id);
      if (!Number.isNaN(n)) district_id = n;
    }

    // Support both multer single (req.file) and fields (req.files.photo)
    let photoFile = null;
    if (req.file) {
      photoFile = req.file;
    } else if (req.files && req.files.photo && Array.isArray(req.files.photo) && req.files.photo.length > 0) {
      photoFile = req.files.photo[0];
    }

    const photo_url_from_upload = photoFile && photoFile.filename ? buildPhotoUrl(photoFile.filename) : null;

    // Check existing artist by user_id
    const [existing] = await pool.query('SELECT id FROM artists WHERE user_id = ? LIMIT 1', [userId]);
    const hasGenresColumn = await columnExists('artists', 'genres');

    if (existing && existing.length > 0) {
      // update existing artist
      const artistId = existing[0].id;
      const updates = [];
      const vals = [];

      updates.push('display_name = ?'); vals.push(display_name);
      updates.push('bio = ?'); vals.push(bio);

      if (photo_url_from_upload) {
        updates.push('photo_url = ?'); vals.push(photo_url_from_upload);
      }

      if (district_id) {
        updates.push('district_id = ?'); vals.push(district_id);
      }

      if (hasGenresColumn && genres && Array.isArray(genres) && genres.length > 0) {
        updates.push('genres = ?'); vals.push(JSON.stringify(genres));
      }

      if (updates.length > 0) {
        vals.push(artistId);
        const sql = `UPDATE artists SET ${updates.join(', ')} WHERE id = ?`;
        await pool.query(sql, vals);
      }

      // mark user as artist and has_profile
      await pool.query('UPDATE users SET has_profile = 1, role = ? WHERE id = ?', ['artist', userId]);

      // fetch fresh artist row
      const [rows] = await pool.query('SELECT * FROM artists WHERE id = ? LIMIT 1', [artistId]);
      const artist = rows[0] || null;

      // fetch fresh user row to return to client for context update
      const [urows] = await pool.query('SELECT id, username, email, role, has_profile FROM users WHERE id = ? LIMIT 1', [userId]);
      const user = urows && urows[0] ? urows[0] : null;

      return res.json({
        message: 'Artist profile updated',
        artist,
        user,
        photo_url: artist ? (artist.photo_url || photo_url_from_upload) : photo_url_from_upload
      });
    } else {
      // Insert new artist
      const fields = ['display_name', 'bio', 'photo_url', 'district_id', 'user_id'];
      const vals = [display_name, bio, null, district_id, userId];

      // if genres column exists and genres provided, insert genres before photo_url (keeps existing order)
      if (hasGenresColumn && genres && Array.isArray(genres) && genres.length > 0) {
        fields.splice(2, 0, 'genres'); // insert at index 2 (after bio)
        vals.splice(2, 0, JSON.stringify(genres));
      }

      // If we have an uploaded photo, set its value in vals (photo_url is at position indexOf('photo_url'))
      if (photo_url_from_upload) {
        const photoIndex = fields.indexOf('photo_url');
        if (photoIndex !== -1) {
          vals[photoIndex] = photo_url_from_upload;
        } else {
          // fallback: push photo_url if not in fields for some reason
          fields.splice(2, 0, 'photo_url');
          vals.splice(2, 0, photo_url_from_upload);
        }
      }

      const placeholders = fields.map(() => '?').join(', ');
      const sql = `INSERT INTO artists (${fields.join(', ')}) VALUES (${placeholders})`;
      const [result] = await pool.query(sql, vals);

      // mark user as artist and has_profile
      await pool.query('UPDATE users SET has_profile = 1, role = ? WHERE id = ?', ['artist', userId]);

      // fetch inserted artist and fresh user
      const [rows] = await pool.query('SELECT * FROM artists WHERE id = ? LIMIT 1', [result.insertId]);
      const artist = rows[0] || null;

      const [urows] = await pool.query('SELECT id, username, email, role, has_profile FROM users WHERE id = ? LIMIT 1', [userId]);
      const user = urows && urows[0] ? urows[0] : null;

      return res.status(201).json({
        message: 'Artist profile created',
        artist,
        user,
        photo_url: artist ? (artist.photo_url || photo_url_from_upload) : photo_url_from_upload
      });
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