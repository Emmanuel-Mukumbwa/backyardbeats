// File: src/server/routes/support.routes.js
const express = require('express');
const router = express.Router();

const support = require('../controllers/support.controller');

// exact auth middleware filename you have
const auth = require('../middleware/auth.middleware');

// try to load an isAdmin middleware if you have one; otherwise provide a simple fallback
let isAdmin;
try {
  isAdmin = require('../middleware/isAdmin.middleware'); // common name
} catch (e1) {
  try {
    isAdmin = require('../middleware/isAdmin'); // alternative
  } catch (e2) {
    // fallback: simple check using req.user.role
    isAdmin = (req, res, next) => {
      if (req.user && req.user.role === 'admin') return next();
      return res.status(403).json({ error: 'Admin only' });
    };
  }
}

const uploadMiddleware = require('../middleware/upload'); // your upload module
const routingUpload = uploadMiddleware && uploadMiddleware._routingUpload ? uploadMiddleware._routingUpload : require('multer')({ dest: 'uploads/support/' });

// configure routingUpload to accept multiple attachments under field 'attachments'
const attachmentsMiddleware = routingUpload.array('attachments', 6);

/* ----------------- ADMIN routes (must be declared BEFORE /:id) ----------------- */
/* Admin routes must appear before any parameterized user routes to avoid accidental matches. */
router.get('/admin', auth, isAdmin, support.adminListTickets);
router.get('/admin/:id', auth, isAdmin, support.adminGetTicket);
router.post('/admin/:id/reply', auth, isAdmin, attachmentsMiddleware, support.adminReply);
router.post('/admin/:id/assign', auth, isAdmin, support.adminAssign);
router.post('/admin/:id/status', auth, isAdmin, support.adminChangeStatus);
router.delete('/admin/:id', auth, isAdmin, support.adminDeleteTicket);

/* ----------------- User routes ----------------- */
/* These handle normal (non-admin) user views and actions */
router.post('/', auth, attachmentsMiddleware, support.createTicket);
router.get('/', auth, support.listUserTickets);
router.get('/:id', auth, support.getTicket);
router.post('/:id/messages', auth, attachmentsMiddleware, support.postMessage);

module.exports = router;