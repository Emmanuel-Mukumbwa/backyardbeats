// server/controllers/events.controller.js
const pool = require('../db').pool;

/**
 * Events controller (uses artists.user_id -> artists.id mapping)
 * - Ensures events are created for the correct artist.id associated with the logged-in user
 * - Normalizes returned rows to { id, title, description, event_date, district_id, artist_id, createdAt }
 */

function normalizeEventRow(row) {
  return {
    id: row.id,
    title: row.title || null,
    description: row.description || null,
    event_date: row.event_date || null,
    district_id: row.district_id ?? null,
    artist_id: row.artist_id ?? null,
    createdAt: row.created_at || row.createdAt || null
  };
}

/**
 * Helper: fetch the artist row for the currently authenticated user.
 * Returns the artist row or null if not found.
 */
async function getArtistForUser(userId) {
  const [rows] = await pool.query('SELECT * FROM artists WHERE user_id = ? LIMIT 1', [userId]);
  return rows && rows.length ? rows[0] : null;
}

exports.listEvents = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const artist = await getArtistForUser(userId);
    if (!artist) {
      return res.status(404).json({ error: 'Artist profile not found. Please complete your artist profile before managing events.' });
    }

    const [rows] = await pool.query('SELECT * FROM events WHERE artist_id = ? ORDER BY event_date DESC', [artist.id]);
    const normalized = (rows || []).map(normalizeEventRow);
    return res.json(normalized);
  } catch (err) {
    next(err);
  }
};

exports.createEvent = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    // Ensure the logged-in user has an artist profile
    const artist = await getArtistForUser(userId);
    if (!artist) {
      return res.status(400).json({ error: 'You must create an artist profile before creating events.' });
    }

    const { title, description, event_date, district_id } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Event title is required.' });
    }

    const sql = `INSERT INTO events (title, description, event_date, district_id, artist_id) VALUES (?, ?, ?, ?, ?)`;
    const [result] = await pool.query(sql, [
      title,
      description || null,
      event_date || null,
      district_id || null,
      artist.id
    ]);

    const [rows2] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [result.insertId]);
    const ev = rows2[0] ? normalizeEventRow(rows2[0]) : null;
    return res.status(201).json(ev);
  } catch (err) {
    next(err);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid event id' });

    // Get artist for user
    const artist = await getArtistForUser(userId);
    if (!artist) return res.status(403).json({ error: 'Artist profile not found or you are not authorized' });

    // Ensure event belongs to this artist
    const [existing] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Event not found' });
    const evRow = existing[0];
    if (Number(evRow.artist_id) !== Number(artist.id)) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    const { title, description, event_date, district_id } = req.body;
    const updates = [];
    const vals = [];

    if (typeof title !== 'undefined') { updates.push('title = ?'); vals.push(title); }
    if (typeof description !== 'undefined') { updates.push('description = ?'); vals.push(description); }
    if (typeof event_date !== 'undefined') { updates.push('event_date = ?'); vals.push(event_date); }
    if (typeof district_id !== 'undefined') { updates.push('district_id = ?'); vals.push(district_id); }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(id);
    const sql = `UPDATE events SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(sql, vals);

    const [rows2] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);
    const updated = rows2[0] ? normalizeEventRow(rows2[0]) : null;
    return res.json(updated);
  } catch (err) {
    next(err);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid event id' });

    const artist = await getArtistForUser(userId);
    if (!artist) return res.status(403).json({ error: 'Artist profile not found or you are not authorized' });

    // ensure event belongs to this artist
    const [existing] = await pool.query('SELECT * FROM events WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Event not found' });
    if (Number(existing[0].artist_id) !== Number(artist.id)) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    await pool.query('DELETE FROM events WHERE id = ? AND artist_id = ?', [id, artist.id]);
    return res.json({ message: 'Event deleted' });
  } catch (err) {
    next(err);
  }
};
