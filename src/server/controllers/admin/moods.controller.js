//src/server/controllers/admin/moods.controller.js
const pool = require('../../db').pool;

/**
 * Moods admin controller
 * - GET /admin/moods
 * - POST /admin/moods
 * - PUT /admin/moods/:id
 * - DELETE /admin/moods/:id
 */

exports.listMoods = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM moods ORDER BY name ASC');
    res.json({ moods: rows });
  } catch (err) {
    next(err);
  }
};

exports.createMood = async (req, res, next) => {
  try {
    const name = (req.body && req.body.name) ? String(req.body.name).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // prevent duplicate
    const [exists] = await pool.query('SELECT id FROM moods WHERE name = ? LIMIT 1', [name]);
    if (exists && exists.length) return res.status(400).json({ error: 'Mood already exists' });

    const [result] = await pool.query('INSERT INTO moods (name) VALUES (?)', [name]);
    const [row] = await pool.query('SELECT id, name FROM moods WHERE id = ? LIMIT 1', [result.insertId]);
    res.json({ success: true, mood: row[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateMood = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const name = (req.body && req.body.name) ? String(req.body.name).trim() : '';
    if (!id || !name) return res.status(400).json({ error: 'Invalid input' });

    await pool.query('UPDATE moods SET name = ? WHERE id = ?', [name, id]);
    const [row] = await pool.query('SELECT id, name FROM moods WHERE id = ? LIMIT 1', [id]);
    res.json({ success: true, mood: row[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteMood = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    await pool.query('DELETE FROM moods WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};