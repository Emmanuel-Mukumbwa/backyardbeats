// src/server/controllers/usersController.controller.js
const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const User = require('../models/User');

// Recovery window (30 days)
const RECOVERY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

exports.list = async (req, res, next) => {
  try {
    const users = await User.findAll();
    // hide sensitive fields
    const safe = users.map(u => {
      const p = u.get ? u.get({ plain: true }) : u;
      if (p.password_hash) delete p.password_hash;
      return p;
    });
    res.json(safe);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const ret = user.get ? user.get({ plain: true }) : user;
    if (ret.password_hash) delete ret.password_hash;
    res.json(ret);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    // It's expected that registration happens via auth controller.
    // If used, be careful to hash password before calling this.
    const payload = { ...req.body };
    // prevent accidental plain password storage
    if (payload.password) delete payload.password;
    const user = await User.create(payload);
    const ret = user.get ? user.get({ plain: true }) : user;
    if (ret.password_hash) delete ret.password_hash;
    res.status(201).json(ret);
  } catch (err) {
    next(err);
  }
};

/**
 * Update handler — protected by auth middleware (route should require auth).
 * Allows only owner (req.user.id === :id) or admin to update.
 * Currently supports safe updates for username only (to match schema).
 * Validates username length and uniqueness.
 */
exports.update = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!req.user || !req.user.id) return res.status(401).json({ error: 'Not authenticated' });

    // allow only owner or admin
    const actorId = Number(req.user.id);
    const actorRole = req.user.role;
    if (actorId !== targetId && actorRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await User.findByPk(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = {};

    // Only allow username update here (username is unique in schema)
    if (typeof req.body.username !== 'undefined') {
      const uname = String(req.body.username || '').trim();
      if (uname.length < 3 || uname.length > 50) {
        return res.status(400).json({ error: 'Username must be 3-50 characters.' });
      }

      // check uniqueness (exclude self)
      const existing = await User.findOne({
        where: {
          username: uname,
          id: { [Op.ne]: user.id }
        }
      });

      if (existing) {
        // if the existing record is deactivated, surface a helpful message
        if (existing.deleted_at) {
          return res.status(409).json({ error: 'That username is associated with a deactivated account. Contact support to release it.' });
        }
        return res.status(409).json({ error: 'Username already exists. Choose another.' });
      }

      updates.username = uname;
    }

    // If no valid fields provided
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update.' });
    }

    await user.update(updates);

    // reload to get fresh values
    await user.reload();

    const ret = user.get ? user.get({ plain: true }) : user;
    if (ret.password_hash) delete ret.password_hash;

    return res.json(ret);
  } catch (err) {
    next(err);
  }
};

/**
 * Admin / generic "remove" endpoint changed to soft-delete.
 * If req.user exists, we set deleted_by to that ID; otherwise null.
 */
exports.remove = async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    const user = await User.findByPk(targetId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.deleted_at) {
      return res.status(400).json({ error: 'Account already deactivated' });
    }

    const deletedBy = (req.user && req.user.id) ? req.user.id : null;
    await user.update({ deleted_at: new Date(), deleted_by: deletedBy });

    return res.json({ message: 'Account deactivated' });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated user's profile (/users/me)
 */
exports.getMe = async (req, res, next) => {
  try {
    const meId = req.user && req.user.id;
    if (!meId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await User.findByPk(meId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const ret = user.get ? user.get({ plain: true }) : user;
    if (ret.password_hash) delete ret.password_hash;

    return res.json({ user: ret });
  } catch (err) {
    next(err);
  }
};

/**
 * Soft-delete (deactivate) the currently authenticated user's account (/users/me)
 * Sets deleted_at and deleted_by
 */
exports.softRemoveMe = async (req, res, next) => {
  try {
    const meId = req.user && req.user.id;
    if (!meId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await User.findByPk(meId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.deleted_at) {
      return res.status(400).json({ error: 'Account already deactivated' });
    }

    await user.update({ deleted_at: new Date(), deleted_by: meId });
    return res.json({ message: 'Account deactivated' });
  } catch (err) {
    next(err);
  }
};

/**
 * Recover the currently authenticated user's account if within the 30-day window (/users/me/recover)
 */
exports.recoverMe = async (req, res, next) => {
  try {
    const meId = req.user && req.user.id;
    if (!meId) return res.status(401).json({ error: 'Not authenticated' });

    const user = await User.findByPk(meId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!user.deleted_at) {
      return res.status(400).json({ error: 'Account is not deactivated' });
    }

    const deletedAt = new Date(user.deleted_at);
    const ageMs = Date.now() - deletedAt.getTime();
    if (ageMs > RECOVERY_WINDOW_MS) {
      return res.status(410).json({ error: 'Recovery window expired. Account cannot be restored.' });
    }

    // restore
    await user.update({ deleted_at: null, deleted_by: null });
    return res.json({ message: 'Account restored' });
  } catch (err) {
    next(err);
  }
};

/**
 * Change password for currently authenticated user (/users/me/change-password)
 * Body: { current_password, new_password }
 */
exports.changePasswordMe = async (req, res, next) => {
  try {
    const meId = req.user && req.user.id;
    if (!meId) return res.status(401).json({ error: 'Not authenticated' });

    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Provide current_password and new_password.' });
    }
    if (String(new_password).length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters.' });
    }

    const user = await User.findByPk(meId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // ensure user model exposes password_hash
    const storedHash = user.password_hash || (user.get && user.get('password_hash'));
    if (!storedHash) return res.status(500).json({ error: 'Password change not available' });

    const valid = await bcrypt.compare(current_password, storedHash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect.' });

    const newHash = await bcrypt.hash(new_password, 10);
    await user.update({ password_hash: newHash });

    return res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};