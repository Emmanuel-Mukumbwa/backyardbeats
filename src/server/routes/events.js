const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');

router.get('/', eventsController.list);
router.get('/:id', eventsController.get);
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

router.post('/', auth, requireRole(['artist', 'admin']), eventsController.create);
router.put('/:id', auth, requireRole(['artist', 'admin']), eventsController.update);
router.delete('/:id', auth, requireRole(['artist', 'admin']), eventsController.remove);

module.exports = router;
