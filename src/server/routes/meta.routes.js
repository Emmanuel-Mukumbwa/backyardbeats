// src/server/routes/meta.routes.js
const express = require('express');
const router = express.Router();
const metaCtrl = require('../controllers/meta.controller');

router.get('/genres', metaCtrl.getGenres);
router.get('/moods', metaCtrl.getMoods);

module.exports = router;  