// server/routes/artistOnboard.routes.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const controller = require('../controllers/artistOnboard.controller');
const { imageUpload } = require('../middleware/upload');

router.use(auth);

// POST /artist/onboard  -> expects field "photo" (image)
router.post('/onboard', imageUpload.single('photo'), controller.onboard);

// GET /artist/me
router.get('/me', controller.getMyProfile);

module.exports = router;
