const express = require('express');
const router = express.Router();
const artistsController = require('../controllers/artistsController');

router.get('/', artistsController.list);
router.get('/:id', artistsController.get);
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.post('/', auth, requireRole(['artist', 'admin']), artistsController.create);
router.put('/:id', auth, requireRole(['artist', 'admin']), artistsController.update);
router.delete('/:id', auth, requireRole(['artist', 'admin']), artistsController.remove);

module.exports = router;
