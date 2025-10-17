// server/controllers/tracks.controller.js
const pool = require('../db').pool;
const path = require('path');

const UPLOADS_PREFIX = process.env.UPLOADS_PREFIX || '/uploads';
const TRACKS_SUBDIR = 'tracks';

// Helper: check if a column is AUTO_INCREMENT
async function isAutoIncrement(table, column) {
  const sql = `
    SELECT EXTRA
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [table, column]);
  if (!rows || rows.length === 0) return false;
  return String(rows[0].EXTRA || '').toLowerCase().includes('auto_increment');
}

// Helper: find artist id by logged-in user id
async function getArtistIdForUser(userId) {
  if (!userId) return null;
  const [rows] = await pool.query('SELECT id FROM artists WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows || rows.length === 0) return null;
  return rows[0].id;
}

// Normalize DB row to frontend shape
function normalizeTrackRow(row) {
  return {
    id: row.id,
    title: row.title || null,
    preview_url: row.preview_url || row.previewUrl || null,
    duration: row.duration || null,
    artist_id: row.artist_id || null,
    createdAt: row.created_at || row.createdAt || null
  };
}

exports.listTracks = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const artistId = await getArtistIdForUser(userId);
    if (!artistId) {
      // If user isn't an artist yet, return empty list (or you could 400)
      return res.json([]);
    }

    const [rows] = await pool.query('SELECT * FROM tracks WHERE artist_id = ? ORDER BY id DESC', [artistId]);
    const normalized = (rows || []).map(normalizeTrackRow);
    return res.json(normalized);
  } catch (err) {
    next(err);
  }
};

exports.createTrack = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Resolve artist id for this user (tracks.artist_id references artists.id)
    const artistId = await getArtistIdForUser(userId);
    if (!artistId) {
      return res.status(400).json({ error: 'Artist profile not found. Please complete onboarding before adding tracks.' });
    }

    // require uploaded file
    if (!req.file || !req.file.filename) {
      return res.status(400).json({ error: 'No audio file uploaded' });
    }

    const fileUrl = path.posix.join(UPLOADS_PREFIX, TRACKS_SUBDIR, req.file.filename);
    const title = req.body.title ? String(req.body.title).trim() : (req.file.originalname || 'Untitled');

    // detect if id is auto_increment
    const idAuto = await isAutoIncrement('tracks', 'id');

    // Build insert fields according to your schema (tracks has: id, artist_id, title, preview_url, duration)
    const fields = [];
    const vals = [];

    if (!idAuto) {
      // compute next id
      const [r] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM tracks');
      const nextId = r && r[0] ? Number(r[0].nextId) : 1;
      fields.push('id'); vals.push(nextId);
    }

    // title
    fields.push('title'); vals.push(title);

    // preview_url column present per your schema
    fields.push('preview_url'); vals.push(fileUrl);

    // artist_id must be set to the artist's id (NOT the user id)
    fields.push('artist_id'); vals.push(artistId);

    // optionally duration if provided and column exists
    if (typeof req.body.duration !== 'undefined') {
      const [cols] = await pool.query('SHOW COLUMNS FROM tracks');
      const colNames = (cols || []).map(c => String(c.Field));
      if (colNames.includes('duration')) {
        fields.push('duration'); vals.push(Number(req.body.duration) || null);
      }
    }

    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO tracks (${fields.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.query(sql, vals);

    // select inserted row by id: if we inserted id manually use that, else use insertId
    const insertedId = !idAuto ? vals[0] : result.insertId;
    const [rows2] = await pool.query('SELECT * FROM tracks WHERE id = ? LIMIT 1', [insertedId]);
    const track = rows2[0] ? normalizeTrackRow(rows2[0]) : null;

    return res.status(201).json(track);
  } catch (err) {
    next(err);
  }
};

exports.updateTrack = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid track id' });

    const [existing] = await pool.query('SELECT * FROM tracks WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Track not found' });

    const row = existing[0];

    // Verify ownership: ensure this track belongs to an artist owned by the logged-in user
    const [artistRows] = await pool.query('SELECT user_id FROM artists WHERE id = ? LIMIT 1', [row.artist_id]);
    const artistRow = artistRows && artistRows[0] ? artistRows[0] : null;
    if (!artistRow || Number(artistRow.user_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // prepare updates (title, preview_url if uploaded, duration)
    const updates = [];
    const vals = [];

    if (typeof req.body.title !== 'undefined') {
      updates.push('title = ?'); vals.push(String(req.body.title));
    }

    if (req.file && req.file.filename) {
      const fileUrl = path.posix.join(UPLOADS_PREFIX, TRACKS_SUBDIR, req.file.filename);
      updates.push('preview_url = ?'); vals.push(fileUrl);
    }

    if (typeof req.body.duration !== 'undefined') {
      const [cols] = await pool.query('SHOW COLUMNS FROM tracks');
      const colNames = (cols || []).map(c => String(c.Field));
      if (colNames.includes('duration')) {
        updates.push('duration = ?'); vals.push(Number(req.body.duration) || null);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    vals.push(id);
    const sql = `UPDATE tracks SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(sql, vals);

    const [rows2] = await pool.query('SELECT * FROM tracks WHERE id = ? LIMIT 1', [id]);
    const updated = rows2[0] ? normalizeTrackRow(rows2[0]) : null;

    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteTrack = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid track id' });

    const [existing] = await pool.query('SELECT * FROM tracks WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Track not found' });

    // Verify ownership same as update
    const row = existing[0];
    const [artistRows] = await pool.query('SELECT user_id FROM artists WHERE id = ? LIMIT 1', [row.artist_id]);
    const artistRow = artistRows && artistRows[0] ? artistRows[0] : null;
    if (!artistRow || Number(artistRow.user_id) !== Number(userId)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM tracks WHERE id = ? AND artist_id = ?', [id, row.artist_id]);
    return res.json({ message: 'Track deleted' });
  } catch (err) {
    next(err);
  }
};
