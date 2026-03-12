// src/server/routes/fan.routes.js
const express = require('express');
const router = express.Router();
const listensController = require('../controllers/listens.controller');
const auth = require('../middleware/auth.middleware');

router.use(auth);

// POST /fan/listens  -> record listen
router.post('/listens', listensController.recordListen);

// GET  /fan/listens  -> recent listens for logged-in user
router.get('/listens', listensController.getUserListens);

// GET /fan/listens/summary -> quick stats
router.get('/listens/summary', listensController.getUserListensSummary);

// DELETE /fan/listens -> clear history
router.delete('/listens', listensController.clearUserListens);

module.exports = router; 