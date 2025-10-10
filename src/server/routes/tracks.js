const express = require('express');
const router = express.Router();
const tracksController = require('../controllers/tracksController');

router.get('/', tracksController.list);
router.get('/:id', tracksController.get);
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.post('/', auth, requireRole(['artist', 'admin']), tracksController.create);
router.put('/:id', auth, requireRole(['artist', 'admin']), tracksController.update);
router.delete('/:id', auth, requireRole(['artist', 'admin']), tracksController.remove);

module.exports = router;
