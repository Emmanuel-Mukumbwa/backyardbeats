// src/server/controllers/admin/privacy.controller.js
const pool = require('../../db').pool;

/**
 * Privacy Policy controller
 *
 * Admin:
 *  - GET /admin/privacy           (list)
 *  - POST /admin/privacy          (create)
 *  - PUT  /admin/privacy/:id      (update)
 *  - DELETE /admin/privacy/:id    (delete)
 *
 * Public:
 *  - GET /privacy                 (get active privacy policy)
 */

exports.listPrivacy = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, title, body, is_active, created_at, updated_at FROM privacy_policies ORDER BY created_at DESC');
    res.json({ privacy: rows });
  } catch (err) {
    next(err);
  }
};

exports.createPrivacy = async (req, res, next) => {
  try {
    const title = (req.body && req.body.title) ? String(req.body.title).trim() : '';
    const body = (req.body && req.body.body) ? String(req.body.body) : '';
    const is_active = req.body && (req.body.is_active === 1 || req.body.is_active === '1' || req.body.is_active === true) ? 1 : 0;

    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });

    if (is_active) {
      await pool.query('UPDATE privacy_policies SET is_active = 0 WHERE is_active = 1');
    }

    const [result] = await pool.query('INSERT INTO privacy_policies (title, body, is_active, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [title, body, is_active]);
    const [row] = await pool.query('SELECT id, title, body, is_active, created_at, updated_at FROM privacy_policies WHERE id = ? LIMIT 1', [result.insertId]);
    res.json({ success: true, policy: row[0] });
  } catch (err) {
    next(err);
  }
};

exports.updatePrivacy = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const title = (req.body && typeof req.body.title !== 'undefined') ? String(req.body.title).trim() : null;
    const body = (req.body && typeof req.body.body !== 'undefined') ? String(req.body.body) : null;
    const is_active = (req.body && typeof req.body.is_active !== 'undefined') ? (req.body.is_active ? 1 : 0) : null;

    if (is_active === 1) {
      await pool.query('UPDATE privacy_policies SET is_active = 0 WHERE is_active = 1');
    }

    const updates = [];
    const params = [];
    if (title !== null) { updates.push('title = ?'); params.push(title); }
    if (body !== null) { updates.push('body = ?'); params.push(body); }
    if (is_active !== null) { updates.push('is_active = ?'); params.push(is_active); }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(id);
    const sql = `UPDATE privacy_policies SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`;
    await pool.query(sql, params);

    const [row] = await pool.query('SELECT id, title, body, is_active, created_at, updated_at FROM privacy_policies WHERE id = ? LIMIT 1', [id]);
    res.json({ success: true, policy: row[0] });
  } catch (err) {
    next(err);
  }
};

exports.deletePrivacy = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });
    await pool.query('DELETE FROM privacy_policies WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Public: return latest active privacy policy (or most recent fallback)
exports.getActivePrivacy = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, title, body, is_active, created_at, updated_at FROM privacy_policies WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1');
    if (rows && rows.length) return res.json({ privacy: rows[0] });
    const [fallback] = await pool.query('SELECT id, title, body, is_active, created_at, updated_at FROM privacy_policies ORDER BY created_at DESC LIMIT 1');
    return res.json({ privacy: fallback[0] || null });
  } catch (err) {
    next(err);
  }
};