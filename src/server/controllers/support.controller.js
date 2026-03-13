const pool = require('../db').pool;
const path = require('path');
const fs = require('fs');
const axios = require('axios'); // optional fallback
const { UPLOAD_BASE } = require('../middleware/upload'); // optional

// Ensure support uploads dir
const SUPPORT_UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'support');
if (!fs.existsSync(SUPPORT_UPLOADS_DIR)) fs.mkdirSync(SUPPORT_UPLOADS_DIR, { recursive: true });

/**
 * Helpers
 */
async function getTicketById(id) {
  const [rows] = await pool.query(`SELECT * FROM support_tickets WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function getMessagesForTicket(ticketId) {
  const [rows] = await pool.query(
    `SELECT sm.*, u.username AS sender_username, u.email AS sender_email
     FROM support_messages sm
     LEFT JOIN users u ON u.id = sm.sender_user_id
     WHERE sm.ticket_id = ?
     ORDER BY sm.created_at ASC`, [ticketId]
  );
  return rows;
}

async function getAttachmentsForTicket(ticketId) {
  const [rows] = await pool.query(`SELECT * FROM support_attachments WHERE ticket_id = ? ORDER BY created_at ASC`, [ticketId]);
  return rows;
}

/**
 * Try to fetch a small snapshot for a polymorphic target (track/event/artist).
 * Returns an object { type, id, title, is_rejected, rejection_reason, extra } or null.
 */
async function fetchTargetSnapshot(target_type, target_id) {
  if (!target_type || target_type === 'none' || !target_id) return null;
  try {
    if (target_type === 'track') {
      const [rows] = await pool.query(`SELECT id, title, is_rejected, rejection_reason, duration, preview_url, preview_artwork FROM tracks WHERE id = ? LIMIT 1`, [target_id]);
      if (rows && rows[0]) {
        const r = rows[0];
        return {
          type: 'track',
          id: r.id,
          title: r.title,
          is_rejected: !!r.is_rejected,
          rejection_reason: r.rejection_reason || null,
          extra: { duration: r.duration, preview_url: r.preview_url || null, preview_artwork: r.preview_artwork || null }
        };
      }
    } else if (target_type === 'event') {
      const [rows] = await pool.query(`SELECT id, title, is_rejected, rejection_reason, event_date, venue, image_url FROM events WHERE id = ? LIMIT 1`, [target_id]);
      if (rows && rows[0]) {
        const r = rows[0];
        return {
          type: 'event',
          id: r.id,
          title: r.title,
          is_rejected: !!r.is_rejected,
          rejection_reason: r.rejection_reason || null,
          extra: { event_date: r.event_date, venue: r.venue || null, image_url: r.image_url || null }
        };
      }
    } else if (target_type === 'artist') {
      const [rows] = await pool.query(`SELECT id, username AS title, is_rejected, rejection_reason FROM users WHERE id = ? LIMIT 1`, [target_id]);
      if (rows && rows[0]) {
        const r = rows[0];
        return {
          type: 'artist',
          id: r.id,
          title: r.title,
          is_rejected: !!r.is_rejected,
          rejection_reason: r.rejection_reason || null,
          extra: {}
        };
      }
    }
  } catch (err) {
    console.warn('fetchTargetSnapshot failed', err && err.message);
    return null;
  }
  return null;
}

/**
 * Utility: try to copy a local file path or reference a remote URL into support attachments.
 * Returns an object: { path, filename, mime, size, is_remote }.
 */
async function copyRemoteOrLocalFileToSupport(srcUrl) {
  if (!srcUrl) return null;

  if (/^https?:\/\//i.test(srcUrl)) {
    const filename = path.basename(srcUrl.split('?')[0]);
    return { path: srcUrl, filename, mime: null, size: null, is_remote: 1 };
  }

  let srcPath = srcUrl;
  if (srcPath.startsWith('/')) {
    srcPath = path.join(__dirname, '..', srcPath);
  } else if (!path.isAbsolute(srcPath)) {
    srcPath = path.join(__dirname, '..', srcUrl);
  }

  try {
    if (!fs.existsSync(srcPath)) {
      const filename = path.basename(srcUrl.split('?')[0]);
      return { path: srcUrl, filename, mime: null, size: null, is_remote: 1 };
    }

    const stat = fs.statSync(srcPath);
    const ext = path.extname(srcPath) || '';
    const basename = path.basename(srcPath, ext).replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-_]/g, '');
    const destName = `support-${Date.now()}-${basename}${ext}`;
    const destPath = path.join(SUPPORT_UPLOADS_DIR, destName);
    fs.copyFileSync(srcPath, destPath);

    const webPath = `/uploads/support/${destName}`;
    return { path: webPath, filename: destName, mime: null, size: stat.size, is_remote: 0 };
  } catch (err) {
    console.warn('copyRemoteOrLocalFileToSupport failed', err && err.message);
    const filename = path.basename(srcUrl.split('?')[0]);
    return { path: srcUrl, filename, mime: null, size: null, is_remote: 1 };
  }
}

/**
 * Create ticket (user)
 * - Enforces a limit: user cannot have more than 3 concurrent open/pending tickets for the same (target_type,target_id).
 */
async function createTicket(req, res) {
  try {
    const userId = req.user.id;
    const { subject, body, type = 'other', target_type = 'none', target_id = null, priority = 'normal' } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'subject and body required' });

    // If target specified, enforce concurrent open/pending limit (3)
    if (target_type && target_type !== 'none' && target_id) {
      const [countRows] = await pool.query(
        `SELECT COUNT(1) AS cnt FROM support_tickets WHERE user_id = ? AND target_type = ? AND target_id = ? AND status IN ('open','pending')`,
        [userId, target_type, target_id]
      );
      const cnt = countRows && countRows[0] ? countRows[0].cnt : 0;
      if (cnt >= 3) {
        return res.status(400).json({ error: 'You already have 3 open/pending tickets for this item. Please wait for responses or close an existing ticket before creating another.' });
      }
    }

    const q = `INSERT INTO support_tickets 
      (user_id, subject, body, type, target_type, target_id, priority) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const [result] = await pool.query(q, [userId, subject, body, type, target_type, target_id || null, priority]);

    const ticketId = result.insertId;

    // initial message stored in support_messages
    const mq = `INSERT INTO support_messages (ticket_id, sender_user_id, sender_role, body) VALUES (?, ?, 'user', ?)`;
    await pool.query(mq, [ticketId, userId, body]);

    // 1) Handle uploaded files from the client (req.files)
    if (req.files && req.files.length) {
      for (const file of req.files) {
        const ins = `INSERT INTO support_attachments (ticket_id, filename, path, mime, size) VALUES (?, ?, ?, ?, ?)`;
        await pool.query(ins, [ticketId, file.originalname, file.path, file.mimetype, file.size]);
      }
    }

    // 2) Handle existing_attachments[] (array of URLs passed from client)
    let existingAttachments = [];
    if (req.body && req.body['existing_attachments[]']) {
      existingAttachments = Array.isArray(req.body['existing_attachments[]']) ? req.body['existing_attachments[]'] : [req.body['existing_attachments[]']];
    } else if (req.body && req.body.existing_attachments) {
      existingAttachments = Array.isArray(req.body.existing_attachments) ? req.body.existing_attachments : [req.body.existing_attachments];
    }

    if (existingAttachments.length) {
      for (const url of existingAttachments) {
        if (!url) continue;
        const filename = path.basename((url || '').split('?')[0]);
        await pool.query(`INSERT INTO support_attachments (ticket_id, filename, path, mime, size) VALUES (?, ?, ?, ?, ?)`, [ticketId, filename, url, null, null]);
      }
    }

    // 3) If include_target_file flag present, try to copy/reference original file from the target
    const includeTargetFile = req.body && (req.body.include_target_file === '1' || req.body.include_target_file === 'true' || req.body.include_target_file === 'on' || req.body.include_target_file === true);
    if (includeTargetFile && target_type && target_id) {
      try {
        if (target_type === 'track') {
          const [rows] = await pool.query(`SELECT preview_url, preview_artwork FROM tracks WHERE id = ? LIMIT 1`, [target_id]);
          const track = rows && rows[0] ? rows[0] : null;
          if (track) {
            if (track.preview_url) {
              const r = await copyRemoteOrLocalFileToSupport(track.preview_url);
              if (r) {
                await pool.query(`INSERT INTO support_attachments (ticket_id, filename, path, mime, size) VALUES (?, ?, ?, ?, ?)`, [ticketId, r.filename || path.basename(r.path || ''), r.path, r.mime || null, r.size || null]);
              }
            }
            if (track.preview_artwork) {
              const r2 = await copyRemoteOrLocalFileToSupport(track.preview_artwork);
              if (r2) {
                await pool.query(`INSERT INTO support_attachments (ticket_id, filename, path, mime, size) VALUES (?, ?, ?, ?, ?)`, [ticketId, r2.filename || path.basename(r2.path || ''), r2.path, r2.mime || null, r2.size || null]);
              }
            }
          }
        } else if (target_type === 'event') {
          const [rows] = await pool.query(`SELECT image_url FROM events WHERE id = ? LIMIT 1`, [target_id]);
          const ev = rows && rows[0] ? rows[0] : null;
          if (ev && ev.image_url) {
            const r = await copyRemoteOrLocalFileToSupport(ev.image_url);
            if (r) {
              await pool.query(`INSERT INTO support_attachments (ticket_id, filename, path, mime, size) VALUES (?, ?, ?, ?, ?)`, [ticketId, r.filename || path.basename(r.path || ''), r.path, r.mime || null, r.size || null]);
            }
          }
        }
      } catch (err) {
        console.warn('include_target_file handling failed', err && err.message);
      }
    }

    // Fetch the created ticket and include target snapshot for response
    const createdTicket = await getTicketById(ticketId);
    const targetSnapshot = await fetchTargetSnapshot(createdTicket.target_type, createdTicket.target_id);

    res.json({ ok: true, ticketId, ticket: { ...createdTicket, targetSnapshot: targetSnapshot || null } });
  } catch (err) {
    console.error('createTicket error', err);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
}

/**
 * List user's tickets (user)
 * Now includes targetSnapshot per ticket to avoid front-end fetches.
 */
async function listUserTickets(req, res) {
  try {
    const userId = req.user.id;
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '25', 10)));
    const offset = (page - 1) * limit;

    const [rows] = await pool.query(
      `SELECT st.* 
       FROM support_tickets st
       WHERE st.user_id = ?
       ORDER BY st.updated_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    // total count for pagination
    const [countRows] = await pool.query(`SELECT COUNT(1) AS total FROM support_tickets WHERE user_id = ?`, [userId]);
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    // Attach snapshots (parallel)
    const rowsWithSnapshot = await Promise.all(rows.map(async (r) => {
      const snapshot = await fetchTargetSnapshot(r.target_type, r.target_id);
      return { ...r, targetSnapshot: snapshot || null };
    }));

    res.json({ tickets: rowsWithSnapshot, meta: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('listUserTickets error', err);
    res.status(500).json({ error: 'Failed to load tickets' });
  }
}

/**
 * Get ticket (user or admin)
 */
async function getTicket(req, res) {
  try {
    const id = req.params.id;
    const userId = req.user.id;

    const ticket = await getTicketById(id);
    if (!ticket) return res.status(404).json({ error: 'Not found' });

    if (req.user.role !== 'admin' && ticket.user_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const messages = await getMessagesForTicket(id);
    const attachments = await getAttachmentsForTicket(id);
    const targetSnapshot = await fetchTargetSnapshot(ticket.target_type, ticket.target_id);

    res.json({ ticket, messages, attachments, targetSnapshot });
  } catch (err) {
    console.error('getTicket error', err);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
}

/**
 * Post a message to a ticket (user or admin depending on role)
 */
async function postMessage(req, res) {
  try {
    const ticketId = req.params.id;
    const userId = req.user.id;
    const body = req.body.body;
    if (!body) return res.status(400).json({ error: 'body required' });

    // check ownership or admin
    const t = await getTicketById(ticketId);
    if (!t) return res.status(404).json({ error: 'Ticket not found' });
    if (req.user.role !== 'admin' && t.user_id !== userId) return res.status(403).json({ error: 'Forbidden' });

    const senderRole = req.user.role === 'admin' ? 'admin' : 'user';
    const [r] = await pool.query(`INSERT INTO support_messages (ticket_id, sender_user_id, sender_role, body) VALUES (?, ?, ?, ?)`, [ticketId, userId, senderRole, body]);

    // attachments (req.files from multer)
    if (req.files && req.files.length) {
      for (const file of req.files) {
        await pool.query(
          `INSERT INTO support_attachments (message_id, ticket_id, filename, path, mime, size) VALUES (?, ?, ?, ?, ?, ?)`,
          [r.insertId, ticketId, file.originalname, file.path, file.mimetype, file.size]
        );
      }
    }

    // update ticket status + updated_at; if admin replied, set to 'open' or keep as appropriate
    const newStatus = req.user.role === 'admin' ? 'open' : 'pending';
    await pool.query(`UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [newStatus, ticketId]);

    res.json({ ok: true, messageId: r.insertId });
  } catch (err) {
    console.error('postMessage error', err);
    res.status(500).json({ error: 'Failed to post message' });
  }
}

/* ----------------- ADMIN METHODS (unchanged) ------------------ */

async function adminListTickets(req, res) {
  try {
    // Ensure admin access
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
    const offset = (page - 1) * limit;

    const filters = [];
    const params = [];

    // Status filter
    if (req.query.status && req.query.status !== 'all') {
      filters.push('st.status = ?');
      params.push(req.query.status);
    }

    // Ticket type filter
    if (req.query.type && req.query.type !== 'all') {
      filters.push('st.type = ?');
      params.push(req.query.type);
    }

    // Assignee filter
    if (req.query.assignee && req.query.assignee !== 'all') {
      filters.push('st.assignee_id = ?');
      params.push(req.query.assignee);
    }

    // Target type filter (track, event, artist etc.)
    if (req.query.target_type && req.query.target_type !== 'all') {
      filters.push('st.target_type = ?');
      params.push(req.query.target_type);
    }

    // Search filter
    if (req.query.q && req.query.q.trim() !== '') {
      const like = `%${req.query.q.trim()}%`;
      filters.push('(st.subject LIKE ? OR st.body LIKE ?)');
      params.push(like, like);
    }

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    // Count total tickets
    const countSql = `
      SELECT COUNT(1) AS total
      FROM support_tickets st
      ${where}
    `;

    const [countRows] = await pool.query(countSql, params);
    const total = countRows?.[0]?.total || 0;

    // Fetch ticket list
    const listSql = `
      SELECT 
        st.*,
        u.username AS user_username,
        u.email AS user_email,
        a.username AS assignee_username
      FROM support_tickets st
      LEFT JOIN users u ON u.id = st.user_id
      LEFT JOIN users a ON a.id = st.assignee_id
      ${where}
      ORDER BY st.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    const listParams = [...params, limit, offset];

    const [rows] = await pool.query(listSql, listParams);

    // Attach target snapshot info (track/event details)
    const rowsWithSnapshot = await Promise.all(
      rows.map(async (r) => {
        let snapshot = null;

        try {
          snapshot = await fetchTargetSnapshot(r.target_type, r.target_id);
        } catch (e) {
          console.warn('snapshot error', r.target_type, r.target_id);
        }

        return {
          ...r,
          targetSnapshot: snapshot || null
        };
      })
    );

    res.json({
      tickets: rowsWithSnapshot,
      meta: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (err) {
    console.error('adminListTickets error:', err);
    res.status(500).json({ error: 'Failed to list tickets' });
  }
}

async function adminGetTicket(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const id = req.params.id;
    const ticket = await getTicketById(id);
    if (!ticket) return res.status(404).json({ error: 'Not found' });

    const [userRows] = await pool.query(`SELECT id, username, email FROM users WHERE id = ? LIMIT 1`, [ticket.user_id]);
    const user = userRows && userRows[0] ? userRows[0] : null;

    const messages = await getMessagesForTicket(id);
    const attachments = await getAttachmentsForTicket(id);
    const targetSnapshot = await fetchTargetSnapshot(ticket.target_type, ticket.target_id);

    res.json({ ticket, user, messages, attachments, targetSnapshot });
  } catch (err) {
    console.error('adminGetTicket error', err);
    res.status(500).json({ error: 'Failed to get ticket' });
  }
}

async function adminReply(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const ticketId = req.params.id;
    const adminId = req.user.id;
    const body = req.body.body;
    if (!body) return res.status(400).json({ error: 'body required' });

    const ticket = await getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const [r] = await pool.query(
      `INSERT INTO support_messages (ticket_id, sender_user_id, sender_role, body) VALUES (?, ?, 'admin', ?)`,
      [ticketId, adminId, body]
    );

    if (req.files && req.files.length) {
      for (const file of req.files) {
        await pool.query(
          `INSERT INTO support_attachments (message_id, ticket_id, filename, path, mime, size) VALUES (?, ?, ?, ?, ?, ?)`,
          [r.insertId, ticketId, file.originalname, file.path, file.mimetype, file.size]
        );
      }
    }

    await pool.query(`UPDATE support_tickets SET status = 'open', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [ticketId]);

    res.json({ ok: true, messageId: r.insertId });
  } catch (err) {
    console.error('adminReply error', err);
    res.status(500).json({ error: 'Failed to send reply' });
  }
}

async function adminAssign(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const id = req.params.id;
    const { assignee_id } = req.body;

    const ticket = await getTicketById(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await pool.query(`UPDATE support_tickets SET assignee_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [assignee_id || null, id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('adminAssign error', err);
    res.status(500).json({ error: 'Failed to assign ticket' });
  }
}

async function adminChangeStatus(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const id = req.params.id;
    const { status } = req.body;
    const allowed = ['open', 'pending', 'resolved', 'closed', 'spam'];
    if (!allowed.includes(status)) return res.status(400).json({ error: 'invalid status' });

    const ticket = await getTicketById(id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    await pool.query(`UPDATE support_tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [status, id]);

    const systemMsg = `Status changed to "${status}" by admin ${req.user.id}`;
    await pool.query(`INSERT INTO support_messages (ticket_id, sender_user_id, sender_role, body) VALUES (?, NULL, 'system', ?)`, [id, systemMsg]);

    res.json({ ok: true });
  } catch (err) {
    console.error('adminChangeStatus error', err);
    res.status(500).json({ error: 'Failed to change status' });
  }
}

async function adminDeleteTicket(req, res) {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const id = req.params.id;
    const [atts] = await pool.query(`SELECT * FROM support_attachments WHERE ticket_id = ?`, [id]);
    if (atts && atts.length) {
      for (const a of atts) {
        try {
          if (a.path && fs.existsSync(a.path)) {
            fs.unlinkSync(a.path);
          }
        } catch (e) {
          console.warn('Failed remove attachment file', a.path, e && e.message);
        }
      }
    }

    await pool.query(`DELETE FROM support_attachments WHERE ticket_id = ?`, [id]);
    await pool.query(`DELETE FROM support_messages WHERE ticket_id = ?`, [id]);
    await pool.query(`DELETE FROM support_tickets WHERE id = ?`, [id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('adminDeleteTicket error', err);
    res.status(500).json({ error: 'Failed to delete ticket' });
  }
}

module.exports = {
  createTicket,
  listUserTickets,
  getTicket,
  postMessage,

  adminListTickets,
  adminGetTicket,
  adminReply,
  adminAssign,
  adminChangeStatus,
  adminDeleteTicket
};