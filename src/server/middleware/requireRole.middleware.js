// server/middleware/requireRole.js
// Usage: requireRole(['artist', 'admin'])
module.exports = function(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return function(req, res, next) {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
};
 