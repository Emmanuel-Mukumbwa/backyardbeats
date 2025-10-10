const Track = require('../models/Track');

exports.list = async (req, res, next) => {
  try {
    const tracks = await Track.findAll();
    res.json(tracks);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const track = await Track.findByPk(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    res.json(track);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    // Only allow artist to upload tracks for their own artist_id, admin can upload for any
    if (req.user.role === 'artist' && req.body.artist_id !== req.user.id) {
      return res.status(403).json({ error: 'Artists can only upload tracks for themselves' });
    }
    const track = await Track.create(req.body);
    res.status(201).json(track);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const track = await Track.findByPk(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    // Only allow artist to update their own tracks, admin can update any
    if (req.user.role === 'artist' && track.artist_id !== req.user.id) {
      return res.status(403).json({ error: 'Artists can only update their own tracks' });
    }
    await track.update(req.body);
    res.json(track);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const track = await Track.findByPk(req.params.id);
    if (!track) return res.status(404).json({ error: 'Track not found' });
    // Only allow artist to delete their own tracks, admin can delete any
    if (req.user.role === 'artist' && track.artist_id !== req.user.id) {
      return res.status(403).json({ error: 'Artists can only delete their own tracks' });
    }
    await track.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
