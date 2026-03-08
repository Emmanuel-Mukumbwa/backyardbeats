// src/server/controllers/profile.controller.js
const { Artist } = require('../models');

exports.getMyProfile = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const artist = await Artist.findOne({
      where: { user_id: req.user.id }
    });

    if (!artist) {
      return res.status(404).json({
        error: "Artist profile not found",
        artist: null
      });
    }

    res.json({
      artist
    });

  } catch (err) {
    console.error("getMyProfile error:", err);
    res.status(500).json({
      error: "Failed to fetch profile"
    });
  }
};