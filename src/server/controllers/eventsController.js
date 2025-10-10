const Event = require('../models/Event');

exports.list = async (req, res, next) => {
  try {
    const events = await Event.findAll();
    res.json(events);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    // Only allow artist to create events for themselves, admin can create any
    if (req.user.role === 'artist' && req.body.artist_id !== req.user.id) {
      return res.status(403).json({ error: 'Artists can only create events for themselves' });
    }
    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    // Only allow artist to update their own events, admin can update any
    if (req.user.role === 'artist' && event.artist_id !== req.user.id) {
      return res.status(403).json({ error: 'Artists can only update their own events' });
    }
    await event.update(req.body);
    res.json(event);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    // Only allow artist to delete their own events, admin can delete any
    if (req.user.role === 'artist' && event.artist_id !== req.user.id) {
      return res.status(403).json({ error: 'Artists can only delete their own events' });
    }
    await event.destroy();
    res.status(204).end();
  } catch (err) {
    next(err);
  }
};
