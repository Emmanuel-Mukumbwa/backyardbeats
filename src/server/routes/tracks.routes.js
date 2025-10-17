// server/routes/tracks.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/tracks.controller');
const { audioUpload } = require('../middleware/upload');

router.use(auth);

router.get('/', controller.listTracks);           // returns tracks for the logged-in artist
router.post('/', audioUpload.single('file'), controller.createTrack);
router.put('/:id', audioUpload.single('file'), controller.updateTrack);
router.delete('/:id', controller.deleteTrack);

module.exports = router;
