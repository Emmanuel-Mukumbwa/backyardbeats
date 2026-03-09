// src/server/controllers/listens.controller.js
const pool = require('../db').pool;

/**
 * Listens controller
 * - POST /fan/listens  -> record a play (auth required)
 * - GET  /fan/listens   -> list recent plays
 * - GET  /fan/listens/summary -> quick stats for current user
 * - DELETE /fan/listens -> clear user's listening history
 *
 * Deduping:
 * - Skips insert if same user+track exists within DEDUP_SECONDS (default 30)
 */

const DEDUP_SECONDS = Number(process.env.LISTEN_DEDUP_SECONDS || 30);

exports.recordListen = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Authentication required' });

    const trackId = req.body.track_id ? Number(req.body.track_id) : null;
    const artistId = req.body.artist_id ? Number(req.body.artist_id) : null;
    const ip = (req.ip || req.headers['x-forwarded-for'] || null);
    const ua = req.get('user-agent') || null;

    // If we have a trackId, do simple dedupe: check last listen timestamp for same user+track
    if (trackId) {
      const [last] = await pool.query(
        `SELECT played_at FROM listens WHERE user_id = ? AND track_id = ? ORDER BY played_at DESC LIMIT 1`,
        [user.id, trackId]
      );
      if (last && last.length) {
        const lastPlayed = new Date(last[0].played_at).getTime();
        const ageSec = (Date.now() - lastPlayed) / 1000;
        if (ageSec <= DEDUP_SECONDS) {
          // treat as duplicate — don't insert, but return 200 with info
          return res.status(200).json({ message: 'Duplicate ignored (dedup window)', ignored: true, within_seconds: DEDUP_SECONDS });
        }
      }
    } else {
      // If no trackId but artistId present, we can also dedupe by artist within window
      if (artistId) {
        const [lastA] = await pool.query(
          `SELECT played_at FROM listens WHERE user_id = ? AND artist_id = ? ORDER BY played_at DESC LIMIT 1`,
          [user.id, artistId]
        );
        if (lastA && lastA.length) {
          const lastPlayed = new Date(lastA[0].played_at).getTime();
          const ageSec = (Date.now() - lastPlayed) / 1000;
          if (ageSec <= DEDUP_SECONDS) {
            return res.status(200).json({ message: 'Duplicate ignored (dedup window by artist)', ignored: true, within_seconds: DEDUP_SECONDS });
          }
        }
      }
    }

    const [insertRes] = await pool.query(
      `INSERT INTO listens (user_id, track_id, artist_id, ip, user_agent, played_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [user.id, trackId, artistId, ip, ua]
    );

    return res.status(201).json({ id: insertRes.insertId, track_id: trackId, artist_id: artistId, played_at: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
};

exports.getUserListens = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Authentication required' });

    const limit = Math.min(100, Number(req.query.limit) || 25);

    const sql = `
      SELECT
        l.id AS listen_id,
        l.played_at,
        l.track_id,
        t.title AS track_title,
        t.preview_url,
        t.duration,
        COALESCE(t.preview_artwork, NULL) AS artwork_url,
        t.genre,
        a.id AS artist_id,
        a.display_name AS artist_name
      FROM listens l
      LEFT JOIN tracks t ON l.track_id = t.id
      LEFT JOIN artists a ON COALESCE(l.artist_id, t.artist_id) = a.id
      WHERE l.user_id = ?
      ORDER BY l.played_at DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(sql, [user.id, limit]);

    const result = (rows || []).map(r => ({
      listen_id: r.listen_id,
      played_at: r.played_at ? new Date(r.played_at).toISOString() : null,
      track: {
        id: r.track_id,
        title: r.track_title,
        preview_url: r.preview_url || null,
        duration: r.duration || null,
        artwork_url: r.artwork_url || null,
        genre: r.genre || null,
      },
      artist: {
        id: r.artist_id || null,
        display_name: r.artist_name || null
      }
    }));

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.getUserListensSummary = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Authentication required' });

    const sql = `
      SELECT
        COUNT(*) AS total_plays,
        COUNT(DISTINCT track_id) AS distinct_tracks,
        MAX(played_at) AS last_played
      FROM listens
      WHERE user_id = ?
    `;
    const [rows] = await pool.query(sql, [user.id]);
    const row = (rows && rows[0]) || { total_plays: 0, distinct_tracks: 0, last_played: null };

    return res.json({
      total_plays: Number(row.total_plays || 0),
      distinct_tracks: Number(row.distinct_tracks || 0),
      last_played: row.last_played ? new Date(row.last_played).toISOString() : null
    });
  } catch (err) {
    next(err);
  }
};

exports.clearUserListens = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user || !user.id) return res.status(401).json({ error: 'Authentication required' });

    await pool.query('DELETE FROM listens WHERE user_id = ?', [user.id]);
    return res.json({ message: 'Listening history cleared' });
  } catch (err) {
    next(err);
  }
};