// src/server/routes/ratings.routes.js
const express = require('express');
const router = express.Router();
const ratingsController = require('../controllers/ratings.controller');

// Public: get ratings for artist (e.g. GET /artists/:id/ratings is what frontend uses)
// This routes file is mounted at /ratings in index.js, but your app also uses /artists/:id/ratings
// so keep this file focused and import it where needed, or use the artists route to call the controller directly.
router.get('/artist/:id', ratingsController.getRatingsForArtist);

// Export router
module.exports = router;
