const express = require('express');
const router = express.Router();
const ratingsController = require('../controllers/ratingsController');

router.get('/', ratingsController.list);
router.get('/:id', ratingsController.get);
router.post('/', ratingsController.create);
router.put('/:id', ratingsController.update);
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// Only admin or owner can delete rating
router.delete('/:id', auth, requireRole(['admin', 'artist']), ratingsController.remove);

module.exports = router;
