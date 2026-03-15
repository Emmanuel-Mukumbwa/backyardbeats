const pool = require('../db').pool;
const path = require('path');
const fs = require('fs');

const UPLOADS_PREFIX = process.env.UPLOADS_PREFIX || '/uploads';
const TRACKS_SUBDIR = 'tracks';

function isAdminIncludeUnapproved(req) {
  return !!(req.user && req.user.role === 'admin' && req.query.include_unapproved === '1');
}

function sanitizeName(s) {
  if (!s) return '';
  // keep parentheses, dashes, underscores, spaces; remove dangerous chars and trim
  return String(s)
    .replace(/["'<>:\\/|?*]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

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

    // Determine file URL field (existing logic)
    const rawFile = row.preview_url || row.previewUrl || row.file_url || row.fileUrl || null;
    if (!rawFile) return res.status(404).json({ error: 'No audio file available for this track' });

    // If the file is an external absolute URL, redirect and add helpful headers
    if (/^https?:\/\//i.test(rawFile)) {
      // Expose headers for CORS before redirect
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Track-Title, X-Track-Artist, X-Track-Genre, Content-Type');
      res.setHeader('X-Track-Title', row.title || '');
      res.setHeader('X-Track-Artist', row.artist_name || '');
      res.setHeader('X-Track-Genre', row.genre || '');
      return res.redirect(302, rawFile);
    }

    // Local file on disk handling
    const normalized = rawFile.startsWith('/') ? rawFile : `/${rawFile}`;
    const fileBasename = path.posix.basename(normalized);
    const ext = path.extname(fileBasename).toLowerCase() || '.mp3';

    const uploadsDir = path.join(__dirname, '..', 'uploads'); // adjust if your uploads path differs
    const fileOnDisk = path.join(uploadsDir, TRACKS_SUBDIR, fileBasename);

    if (!fs.existsSync(fileOnDisk)) {
      return res.status(404).json({ error: 'File not found on server', file: fileOnDisk });
    }

    // Prefer DB title first (most human-friendly)
    let prettyBase = null;
    if (row.title && typeof row.title === 'string' && row.title.trim().length > 0) {
      prettyBase = sanitizeName(row.title);
    }

    // If no title, try common original-name columns
    if (!prettyBase) {
      const candidateOriginals = [
        row.original_name, row.file_name, row.originalFilename, row.originalName, row.filename, row.upload_name
      ];
      for (let i = 0; i < candidateOriginals.length; i += 1) {
        const c = candidateOriginals[i];
        if (c && typeof c === 'string' && c.trim()) {
          const noExt = c.replace(/\.[^/.]+$/, '');
          prettyBase = sanitizeName(noExt);
          break;
        }
      }
    }

    // Fallback: derive from stored filename (strip known prefixes)
    if (!prettyBase) {
      let base = fileBasename.replace(/\.[^/.]+$/, '');
      base = base.replace(/^trk-[^-]+-[0-9]+-/, '');
      base = base.replace(/^trk-[0-9]+-/, '');
      base = base.replace(/^upload-/, '');
      base = base.replace(/^uid-/, '');
      base = base.replace(/^file-/, '');
      base = base.replace(/^[\-_]+/, '');
      prettyBase = sanitizeName(base) || `track-${id}`;
    }

    // Append tag
    const tag = '(downloaded from backyardbeats)';
    let attachmentBase = `${prettyBase} ${tag}`;
    if (attachmentBase.length > 190) attachmentBase = attachmentBase.substring(0, 190);
    const attachmentFilename = `${attachmentBase}${ext}`;

    // infer content type by extension (basic)
    let contentType = 'application/octet-stream';
    if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.m4a' || ext === '.mp4') contentType = 'audio/mp4';
    else if (ext === '.ogg') contentType = 'audio/ogg';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.flac') contentType = 'audio/flac';

    // ensure client JS can read these headers across CORS
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Track-Title, X-Track-Artist, X-Track-Genre, Content-Type');

    // set headers (both quoted and filename* for RFC5987)
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachmentFilename}"; filename*=UTF-8''${encodeURIComponent(attachmentFilename)}`);
    res.setHeader('X-Track-Title', row.title || '');
    res.setHeader('X-Track-Artist', row.artist_name || '');
    res.setHeader('X-Track-Genre', row.genre || '');

    // debug log (remove or disable in production if you prefer)
    console.log(`Download: id=${id} file=${fileOnDisk} attach="${attachmentFilename}"`);

    // stream file
    const stream = fs.createReadStream(fileOnDisk);
    stream.on('error', (err) => {
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