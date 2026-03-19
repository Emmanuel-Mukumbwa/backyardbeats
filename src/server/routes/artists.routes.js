// server/routes/artists.routes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/artists.controller');
const ratingsCtrl = require('../controllers/ratings.controller');
const auth = require('../middleware/auth.middleware');

// Public artist listing and detail routes
router.get('/', controller.listArtists);
router.get('/:id', controller.getArtistById);

// Authenticated artist stats route
// IMPORTANT: place this before "/:id" style routes so "/me/plays-summary" is not treated as an id.
router.get('/me/plays-summary', auth, controller.getMyPlaysSummary);

// Ratings sub-route
router.get('/:id/ratings', ratingsCtrl.getRatingsForArtist);

module.exports = router;