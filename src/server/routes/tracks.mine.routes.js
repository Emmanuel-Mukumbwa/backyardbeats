// src/server/routes/tracks.mine.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const tracks = require('../controllers/tracks.mine.controller');

// returns tracks for current user
router.get('/mine', auth, tracks.listMyTracks);

// single track (with owner check)
router.get('/:id', auth, tracks.getTrack);

module.exports = router;