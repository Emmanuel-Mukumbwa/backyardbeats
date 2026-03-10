const pool = require('../db').pool;
const path = require('path');
const fs = require('fs');

const UPLOADS_PREFIX = process.env.UPLOADS_PREFIX || '/uploads';
const TRACKS_SUBDIR = 'tracks';
const ARTWORK_SUBDIR = path.posix.join(TRACKS_SUBDIR, 'artwork');

// Admin override helper (admin + ?include_unapproved=1)
function isAdminIncludeUnapproved(req) {
  return !!(req.user && req.user.role === 'admin' && req.query.include_unapproved === '1');
}

async function getArtistIdForUser(userId) {
  if (!userId) return null;
  const [rows] = await pool.query('SELECT * FROM artists WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows || rows.length === 0) return null;
  return rows[0];
}

async function getUserRow(userId) {
  if (!userId) return null;
  const [rows] = await pool.query('SELECT id, username, banned, deleted_at FROM users WHERE id = ? LIMIT 1', [userId]);
  return (rows && rows[0]) || null;
}

function normalizeTrackRow(row) {
  const base = {
    id: row.id,
    title: row.title || null,
    preview_url: row.preview_url || row.previewUrl || row.file_url || null,
    artwork_url: row.preview_artwork || row.artwork_url || row.cover_url || null,
    genre: row.genre || null,
    duration: (typeof row.duration !== 'undefined' && row.duration !== null) ? Number(row.duration) : null,
    artist_id: row.artist_id || null,
    createdAt: row.created_at || row.createdAt || null
  };

  base.is_approved = !!row.is_approved;
  base.is_rejected = !!row.is_rejected;
  base.rejection_reason = row.rejection_reason || null;
  base.approved_at = row.approved_at || null;
  base.rejected_at = row.rejected_at || null;

  return base;
}

/**
 * (existing list/create/update/delete kept unchanged above/below)
 * Only the downloadTrack function has been improved to derive a nicer filename.
 */

exports.listTracks = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const userRow = await getUserRow(userId);
    if (!userRow) return res.status(401).json({ error: 'User not found' });
    if (userRow.deleted_at) return res.status(410).json({ status: 'deleted', message: 'Account deleted' });
    if (userRow.banned) return res.status(403).json({ status: 'banned', message: 'Account banned' });

    const artist = await getArtistIdForUser(userId);
    if (!artist) return res.json([]);

    const adminOverride = isAdminIncludeUnapproved(req);

    const [rows] = await pool.query('SELECT * FROM tracks WHERE artist_id = ? ORDER BY id DESC', [artist.id]);
    const normalized = (rows || []).map(r => {
      const out = normalizeTrackRow(r);
      if (adminOverride) {
        out.is_approved = !!r.is_approved;
        out.is_rejected = !!r.is_rejected;
        out.approved_at = r.approved_at || null;
        out.rejected_at = r.rejected_at || null;
        out.rejection_reason = r.rejection_reason || null;
      }
      return out;
    });
    return res.json(normalized);
  } catch (err) {
    next(err);
  }
};

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

exports.createTrack = async (req, res, next) => {
  try {
    const userId = req.user && req.user.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const userRow = await getUserRow(userId);
    if (!userRow) return res.status(401).json({ error: 'User not found' });
    if (userRow.deleted_at) return res.status(410).json({ status: 'deleted', message: 'Account deleted' });
    if (userRow.banned) return res.status(403).json({ status: 'banned', message: 'Account banned' });

    const artist = await getArtistIdForUser(userId);
    if (!artist) return res.status(400).json({ error: 'Artist profile not found. Please complete onboarding before adding tracks.' });

    const adminOverride = isAdminIncludeUnapproved(req);
    if (!adminOverride) {
      if (artist.is_rejected) {
        return res.status(403).json({ status: 'rejected', message: 'Artist profile rejected.' });
      }
      if (!artist.is_approved) {
        return res.status(403).json({ status: 'pending_verification', message: 'Artist profile is pending verification.' });
      }
    }

    const audioFile = req.files?.file?.[0];
    const artworkFile = req.files?.artwork?.[0];

    if (!audioFile) return res.status(400).json({ error: 'No audio file uploaded (field: file)' });

    const audioUrl = path.posix.join(UPLOADS_PREFIX, TRACKS_SUBDIR, audioFile.filename);
    const artworkUrl = artworkFile ? path.posix.join(UPLOADS_PREFIX, ARTWORK_SUBDIR, artworkFile.filename) : null;

    const title = req.body.title ? String(req.body.title).trim() : (audioFile.originalname || 'Untitled');
    const genre = req.body.genre ? String(req.body.genre).trim() : null;
    const duration = typeof req.body.duration !== 'undefined' ? (Number(req.body.duration) || null) : null;

    const idAuto = await isAutoIncrement('tracks', 'id');

    const [cols] = await pool.query('SHOW COLUMNS FROM tracks');
    const colNames = (cols || []).map(c => String(c.Field));

    const fields = [];
    const vals = [];

    if (!idAuto && colNames.includes('id')) {
      const [r] = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS nextId FROM tracks');
      const nextId = r && r[0] ? Number(r[0].nextId) : 1;
      fields.push('id'); vals.push(nextId);
    }

    if (colNames.includes('title')) { fields.push('title'); vals.push(title); }

    if (colNames.includes('preview_url')) { fields.push('preview_url'); vals.push(audioUrl); }
    else if (colNames.includes('previewUrl')) { fields.push('previewUrl'); vals.push(audioUrl); }
    else if (colNames.includes('file_url')) { fields.push('file_url'); vals.push(audioUrl); }

    if (colNames.includes('artist_id')) { fields.push('artist_id'); vals.push(artist.id); }

    if (genre && colNames.includes('genre')) { fields.push('genre'); vals.push(genre); }
    if (duration !== null && colNames.includes('duration')) { fields.push('duration'); vals.push(duration); }

    const artworkCol = colNames.includes('preview_artwork') ? 'preview_artwork'
      : (colNames.includes('artwork_url') ? 'artwork_url'
      : (colNames.includes('cover_url') ? 'cover_url' : null));
    if (artworkUrl && artworkCol) { fields.push(artworkCol); vals.push(artworkUrl); }

    // Also try to store original filename if a column exists (helpful for future downloads)
    const originalNameCol = colNames.includes('original_name') ? 'original_name'
      : (colNames.includes('file_name') ? 'file_name' : (colNames.includes('originalFilename') ? 'originalFilename' : null));
    if (originalNameCol) {
      fields.push(originalNameCol);
      vals.push(audioFile.originalname || audioFile.originalName || audioFile.filename);
    }

    if (fields.length === 0) return res.status(500).json({ error: 'No writable columns found in tracks table' });

    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO tracks (${fields.join(', ')}) VALUES (${placeholders})`;
    const [result] = await pool.query(sql, vals);

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
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid track id' });

    const [existing] = await pool.query('SELECT * FROM tracks WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Track not found' });
    const row = existing[0];

    const [artistRows] = await pool.query('SELECT * FROM artists WHERE id = ? LIMIT 1', [row.artist_id]);
    const artist = artistRows && artistRows[0] ? artistRows[0] : null;
    if (!artist) return res.status(404).json({ error: 'Artist not found' });

    if (Number(artist.user_id) !== Number(userId) && !(req.user && req.user.role === 'admin')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const userRow = await getUserRow(userId);
    if (!userRow) return res.status(401).json({ error: 'User not found' });
    if (userRow.deleted_at) return res.status(410).json({ status: 'deleted', message: 'Account deleted' });
    if (userRow.banned) return res.status(403).json({ status: 'banned', message: 'Account banned' });

    const adminOverride = isAdminIncludeUnapproved(req);
    if (!adminOverride) {
      if (artist.is_rejected) return res.status(403).json({ status: 'rejected', message: 'Artist profile rejected.' });
      if (!artist.is_approved) return res.status(403).json({ status: 'pending_verification', message: 'Artist profile pending verification.' });
    }

    const audioFile = req.files?.file?.[0];
    const artworkFile = req.files?.artwork?.[0];

    const updates = [];
    const vals = [];

    if (typeof req.body.title !== 'undefined') {
      updates.push('title = ?'); vals.push(String(req.body.title));
    }

    if (audioFile) {
      const audioUrl = path.posix.join(UPLOADS_PREFIX, TRACKS_SUBDIR, audioFile.filename);
      const [cols] = await pool.query('SHOW COLUMNS FROM tracks');
      const colNames = (cols || []).map(c => String(c.Field));
      if (colNames.includes('preview_url')) { updates.push('preview_url = ?'); vals.push(audioUrl); }
      else if (colNames.includes('previewUrl')) { updates.push('previewUrl = ?'); vals.push(audioUrl); }
      else if (colNames.includes('file_url')) { updates.push('file_url = ?'); vals.push(audioUrl); }

      // update original name if column exists
      const originalNameCol = colNames.includes('original_name') ? 'original_name'
        : (colNames.includes('file_name') ? 'file_name' : (colNames.includes('originalFilename') ? 'originalFilename' : null));
      if (originalNameCol) {
        updates.push(`${originalNameCol} = ?`);
        vals.push(audioFile.originalname || audioFile.originalName || audioFile.filename);
      }
    }

    if (artworkFile) {
      const artworkUrl = path.posix.join(UPLOADS_PREFIX, ARTWORK_SUBDIR, artworkFile.filename);
      const [cols] = await pool.query('SHOW COLUMNS FROM tracks');
      const colNames = (cols || []).map(c => String(c.Field));
      const artworkCol = colNames.includes('preview_artwork') ? 'preview_artwork'
        : (colNames.includes('artwork_url') ? 'artwork_url'
        : (colNames.includes('cover_url') ? 'cover_url' : null));
      if (artworkCol) { updates.push(`${artworkCol} = ?`); vals.push(artworkUrl); }
    }

    if (typeof req.body.genre !== 'undefined') {
      const [cols] = await pool.query('SHOW COLUMNS FROM tracks');
      const colNames = (cols || []).map(c => String(c.Field));
      if (colNames.includes('genre')) { updates.push('genre = ?'); vals.push(String(req.body.genre)); }
    }

    if (typeof req.body.duration !== 'undefined') {
      const [cols] = await pool.query('SHOW COLUMNS FROM tracks');
      const colNames = (cols || []).map(c => String(c.Field));
      if (colNames.includes('duration')) { updates.push('duration = ?'); vals.push(Number(req.body.duration) || null); }
    }

    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    vals.push(id);
    const sql = `UPDATE tracks SET ${updates.join(', ')} WHERE id = ?`;
    await pool.query(sql, vals);

    // If a non-admin user edited an already-approved track, revert it to pending approval.
    try {
      const wasApproved = Number(row.is_approved) === 1;
      if (wasApproved && !adminOverride) {
        await pool.query(
          `UPDATE tracks SET is_approved = 0, is_rejected = 0, approved_at = NULL, rejected_at = NULL, rejection_reason = NULL WHERE id = ?`,
          [id]
        );
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to reset track approval state after edit:', e);
    }

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
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid track id' });

    const [existing] = await pool.query('SELECT * FROM tracks WHERE id = ? LIMIT 1', [id]);
    if (!existing || existing.length === 0) return res.status(404).json({ error: 'Track not found' });
    const row = existing[0];

    const [artistRows] = await pool.query('SELECT * FROM artists WHERE id = ? LIMIT 1', [row.artist_id]);
    const artist = artistRows && artistRows[0] ? artistRows[0] : null;
    if (!artist) return res.status(404).json({ error: 'Artist not found' });

    if (Number(artist.user_id) !== Number(userId) && !(req.user && req.user.role === 'admin')) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const userRow = await getUserRow(userId);
    if (!userRow) return res.status(401).json({ error: 'User not found' });
    if (userRow.deleted_at) return res.status(410).json({ status: 'deleted', message: 'Account deleted' });
    if (userRow.banned) return res.status(403).json({ status: 'banned', message: 'Account banned' });

    await pool.query('DELETE FROM tracks WHERE id = ? AND artist_id = ?', [id, row.artist_id]);
    return res.json({ message: 'Track deleted' });
  } catch (err) {
    next(err);
  }
};

/**
 * downloadTrack - streams the actual audio file to the client with a friendly filename
 * GET /tracks/:id/download
 */
exports.downloadTrack = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid track id' });

    const adminOverride = isAdminIncludeUnapproved(req);

    const sql = `
      SELECT t.*,
             a.display_name AS artist_name,
             a.is_approved AS artist_is_approved,
             a.is_rejected AS artist_is_rejected,
             u.deleted_at AS artist_user_deleted_at,
             u.banned AS artist_user_banned
      FROM tracks t
      LEFT JOIN artists a ON t.artist_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE t.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Track not found' });
    const row = rows[0];

    // Visibility checks (non-admin)
    if (!adminOverride) {
      if (row.artist_user_deleted_at) return res.status(410).json({ status: 'deleted', message: 'Artist account deleted' });
      if (row.artist_user_banned) return res.status(403).json({ status: 'banned', message: 'Artist account banned' });
      if (row.artist_is_rejected) return res.status(403).json({ status: 'rejected', message: 'Artist profile rejected' });
      if (!row.artist_is_approved) return res.status(403).json({ status: 'pending_verification', message: 'Artist profile pending verification' });
    }

    // Determine file URL field
    const rawFile = row.preview_url || row.previewUrl || row.file_url || row.fileUrl || null;
    if (!rawFile) return res.status(404).json({ error: 'No audio file available for this track' });

    // If the file is an absolute URL (external storage), redirect to it.
    if (/^https?:\/\//i.test(rawFile)) {
      res.setHeader('X-Track-Title', row.title || '');
      res.setHeader('X-Track-Artist', row.artist_name || '');
      res.setHeader('X-Track-Genre', row.genre || '');
      return res.redirect(302, rawFile);
    }

    // Normalize and get basename + ext
    const normalized = rawFile.startsWith('/') ? rawFile : `/${rawFile}`;
    const fileBasename = path.posix.basename(normalized);
    const ext = path.extname(fileBasename).toLowerCase() || '.mp3';

    const uploadsDir = path.join(__dirname, '..', 'uploads'); // adjust if your uploads path differs
    const fileOnDisk = path.join(uploadsDir, TRACKS_SUBDIR, fileBasename);

    if (!fs.existsSync(fileOnDisk)) {
      return res.status(404).json({ error: 'File not found on server', file: fileOnDisk });
    }

    // Attempt to derive a friendly base name for the attachment:
    // 1) Prefer explicit columns if available (original_name, file_name, filename)
    // 2) Else strip common generated prefixes like "trk-<x>-<timestamp>-" from stored filename
    // 3) Ensure not too long and sanitize
    function sanitizeName(s) {
      if (!s) return '';
      return String(s).replace(/["'<>:\\/|?*]+/g, '').trim();
    }

    // try DB columns that commonly hold original name
    const candidateOriginals = [
      row.original_name, row.file_name, row.originalFilename, row.originalName, row.filename, row.upload_name
    ];
    let prettyBase = null;
    for (let i = 0; i < candidateOriginals.length; i += 1) {
      const c = candidateOriginals[i];
      if (c && typeof c === 'string') {
        const noExt = c.replace(/\.[^/.]+$/, '');
        prettyBase = sanitizeName(noExt);
        break;
      }
    }

    if (!prettyBase) {
      // fallback: derive from stored filename by removing common prefixes:
      let base = fileBasename.replace(/\.[^/.]+$/, '');
      // common prefix patterns: trk-<num>-<timestamp>-..., trk-<something>-<timestamp>-..., upload-..., uid-
      base = base.replace(/^trk-[^-]+-[0-9]+-/, ''); // trk-9-1772883452861-...
      base = base.replace(/^trk-[0-9]+-/, ''); // trk-12345-...
      base = base.replace(/^upload-/, '');
      base = base.replace(/^uid-/, '');
      base = base.replace(/^file-/, '');
      base = base.replace(/^[\-_]+/, '');
      prettyBase = sanitizeName(base) || `track-${id}`;
    }

    // append tag
    const tag = '(downloaded from backyardbeats)';
    // include tag within parentheses next to name (they asked for that)
    let attachmentBase = `${prettyBase}${tag}`;
    // trim to reasonable length
    if (attachmentBase.length > 200) {
      attachmentBase = attachmentBase.substring(0, 190);
    }

    const attachmentFilename = `${attachmentBase}${ext}`;

    // infer content type by extension
    let contentType = 'application/octet-stream';
    if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.m4a' || ext === '.mp4') contentType = 'audio/mp4';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.flac') contentType = 'audio/flac';

    // set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachmentFilename}"`);
    res.setHeader('X-Track-Title', row.title || '');
    res.setHeader('X-Track-Artist', row.artist_name || '');
    res.setHeader('X-Track-Genre', row.genre || '');

    // stream
    const stream = fs.createReadStream(fileOnDisk);
    stream.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('File stream error', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      } else {
        res.destroy();
      }
    });
    return stream.pipe(res);
  } catch (err) {
    next(err);
  }
};