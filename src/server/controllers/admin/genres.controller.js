const pool = require('../../db').pool;

/**
 * Genres admin controller
 * - GET /admin/genres
 * - POST /admin/genres
 * - PUT /admin/genres/:id
 * - DELETE /admin/genres/:id
 */

exports.listGenres = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name FROM genres ORDER BY name ASC');
    res.json({ genres: rows });
  } catch (err) {
    next(err);
  }
};

exports.createGenre = async (req, res, next) => {
  try {
    const name = (req.body && req.body.name) ? String(req.body.name).trim() : '';
    if (!name) return res.status(400).json({ error: 'Name is required' });

    // prevent duplicate
    const [exists] = await pool.query('SELECT id FROM genres WHERE name = ? LIMIT 1', [name]);
    if (exists && exists.length) return res.status(400).json({ error: 'Genre already exists' });

    const [result] = await pool.query('INSERT INTO genres (name) VALUES (?)', [name]);
    const [row] = await pool.query('SELECT id, name FROM genres WHERE id = ? LIMIT 1', [result.insertId]);
    res.json({ success: true, genre: row[0] });
  } catch (err) {
    next(err);
  }
};

exports.updateGenre = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const name = (req.body && req.body.name) ? String(req.body.name).trim() : '';
    if (!id || !name) return res.status(400).json({ error: 'Invalid input' });

    await pool.query('UPDATE genres SET name = ? WHERE id = ?', [name, id]);
    const [row] = await pool.query('SELECT id, name FROM genres WHERE id = ? LIMIT 1', [id]);
    res.json({ success: true, genre: row[0] });
  } catch (err) {
    next(err);
  }
};

exports.deleteGenre = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    await pool.query('DELETE FROM genres WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};