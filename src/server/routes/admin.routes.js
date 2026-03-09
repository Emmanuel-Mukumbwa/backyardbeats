// src/server/routes/admin.routes.js
const express = require('express');
const router = express.Router();

// load the barrel (controllers/admin/index.js)
const admin = require('../controllers/admin');

// helper: check that a handler exists and is a function
function assertHandler(name) {
  const h = admin[name];
  if (typeof h !== 'function') {
    // Helpful error: include available keys to help debugging
    const available = Object.keys(admin).join(', ') || '(none)';
    const errMsg = [
      `Admin route handler missing or invalid: "${name}"`,
      `Available admin exports: ${available}`,
      `Check src/server/controllers/admin/${name}.controller.js and controllers/admin/index.js for typos or missing exports.`
    ].join(' | ');
    // Throwing here stops server start and gives clear message.
    throw new Error(errMsg);
  }
}

/* ---------------- quick ping (always present) ---------------- */
router.get('/ping', (req, res) => res.json({ ok: true, msg: 'admin router reachable' }));

/* ----------------- register routes (validated) ----------------- */

// Analytics
assertHandler('getAnalytics');
router.get('/analytics', /* auth, isAdmin, */ admin.getAnalytics);

// Users (user management)
assertHandler('listUsers');
assertHandler('updateUser');
assertHandler('banUser');
assertHandler('softDeleteUser');
assertHandler('restoreUser');
router.get('/users', /* auth, isAdmin, */ admin.listUsers);
router.put('/users/:id', /* auth, isAdmin, */ admin.updateUser);
router.post('/users/:id/ban', /* auth, isAdmin, */ admin.banUser);
router.delete('/users/:id', /* auth, isAdmin, */ admin.softDeleteUser);
router.post('/users/:id/restore', /* auth, isAdmin, */ admin.restoreUser);

// Artists approvals
assertHandler('pendingArtists');
assertHandler('approveArtist');
assertHandler('rejectArtist');
router.get('/pending/artists', /* auth, isAdmin, */ admin.pendingArtists);
router.post('/pending/artists/:id/approve', /* auth, isAdmin, */ admin.approveArtist);
router.post('/pending/artists/:id/reject', /* auth, isAdmin, */ admin.rejectArtist);

// Tracks approvals
assertHandler('pendingTracks');
assertHandler('approveTrack');
assertHandler('rejectTrack');
router.get('/pending/tracks', /* auth, isAdmin, */ admin.pendingTracks);
router.post('/pending/tracks/:id/approve', /* auth, isAdmin, */ admin.approveTrack);
router.post('/pending/tracks/:id/reject', /* auth, isAdmin, */ admin.rejectTrack);

// Events approvals
assertHandler('pendingEvents');
assertHandler('approveEvent');
assertHandler('rejectEvent');
router.get('/pending/events', /* auth, isAdmin, */ admin.pendingEvents);
router.post('/pending/events/:id/approve', /* auth, isAdmin, */ admin.approveEvent);
router.post('/pending/events/:id/reject', /* auth, isAdmin, */ admin.rejectEvent);

// Ratings moderation
assertHandler('listRatings');
assertHandler('deleteRating');
router.get('/ratings', /* auth, isAdmin, */ admin.listRatings);
router.delete('/ratings/:id', /* auth, isAdmin, */ admin.deleteRating);

// Settings
assertHandler('getSettings');
assertHandler('updateSettings');
router.get('/settings', /* auth, isAdmin, */ admin.getSettings);
router.post('/settings', /* auth, isAdmin, */ admin.updateSettings);

module.exports = router;