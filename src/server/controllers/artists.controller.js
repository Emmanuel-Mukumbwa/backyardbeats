// server/controllers/artists.controller.js
const pool = require('../db').pool;

/**
 * Helper: isAdminRequest
 * Returns true if current request is from an authenticated admin & explicitly asked to include unapproved
 */
function isAdminIncludeUnapproved(req) {
  return !!(req.user && req.user.role === 'admin' && req.query.include_unapproved === '1');
}

/**
 * GET /artists
 * Optional query params:
 *   - district (id)
 *   - q (search by display_name)
 *   - include_unapproved=1 (only for admin)
 *
 * By default only returns approved artists whose account is not deleted and not banned.
 */
exports.listArtists = async (req, res, next) => {
  try {
    const params = [];
    let where = 'WHERE 1=1';

    // Admin override: include unapproved/rejected (for admin tools)
    const adminOverride = isAdminIncludeUnapproved(req);

    // Search by district (uses district_id)
    if (req.query.district) {
      where += ' AND a.district_id = ?';
      params.push(req.query.district);
    }

    // Search by name
    if (req.query.q) {
      where += ' AND a.display_name LIKE ?';
      params.push(`%${req.query.q}%`);
    }

    // Default visibility constraints (unless admin override)
    if (!adminOverride) {
      where += ' AND a.is_approved = 1 AND a.is_rejected = 0';
      // Ensure associated user account is active (not soft-deleted and not banned)
      where += ' AND u.deleted_at IS NULL AND u.banned = 0';
    }

    const sql = `
      SELECT
        a.*,
        u.username,
        u.banned,
        u.deleted_at
      FROM artists a
      LEFT JOIN users u ON a.user_id = u.id
      ${where}
      ORDER BY a.id DESC
      LIMIT 200
    `;
    const [rows] = await pool.query(sql, params);

    // Map rows to safe output (strip sensitive bits, include a 'status' field for UI if admin requested)
    const result = (rows || []).map(r => {
      const status = r.is_approved ? 'approved' : (r.is_rejected ? 'rejected' : 'pending');
      return {
        id: r.id,
        display_name: r.display_name,
        bio: r.bio,
        photo_url: r.photo_url,
        lat: r.lat,
        lng: r.lng,
        district_id: r.district_id,
        avg_rating: r.avg_rating,
        follower_count: r.follower_count,
        has_upcoming_event: !!r.has_upcoming_event,
        // admin-only metadata included if admin override is used
        ...(adminOverride ? {
          is_approved: !!r.is_approved,
          is_rejected: !!r.is_rejected,
          approved_at: r.approved_at,
          rejected_at: r.rejected_at,
          approved_by: r.approved_by,
          rejected_by: r.rejected_by,
          rejection_reason: r.rejection_reason,
          user: {
            username: r.username,
            banned: !!r.banned,
            deleted_at: r.deleted_at
          },
          status
        } : {}),
        // public-friendly minimal fields
        status: adminOverride ? status : undefined
      };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /artists/:id
 * Returns approved artist data for public use.
 * If the artist exists but is not approved/rejected/banned/deleted, returns a clear status message
 * that the frontend can surface (pending, rejected, banned, deleted).
 */
exports.getArtistById = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid artist id' });

    const sql = `
      SELECT
        a.*,
        u.id AS user_id,
        u.username,
        u.banned,
        u.deleted_at
      FROM artists a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const artist = rows[0];

    // Check user account state first
    if (artist.deleted_at) {
      return res.status(410).json({
        status: 'deleted',
        message: 'This artist account has been deleted.'
      });
    }
    if (artist.banned) {
      return res.status(403).json({
        status: 'banned',
        message: 'This artist account has been banned.'
      });
    }

    // Artist application status
    if (artist.is_approved) {
      // Approved -> return full artist payload for public view
      const payload = {
        id: artist.id,
        display_name: artist.display_name,
        bio: artist.bio,
        photo_url: artist.photo_url,
        lat: artist.lat,
        lng: artist.lng,
        district_id: artist.district_id,
        avg_rating: artist.avg_rating,
        follower_count: artist.follower_count,
        has_upcoming_event: !!artist.has_upcoming_event,
        approved_at: artist.approved_at,
        user: {
          id: artist.user_id,
          username: artist.username
        }
      };
      return res.json(payload);
    }

    // Rejected
    if (artist.is_rejected) {
      return res.status(403).json({
        status: 'rejected',
        message: artist.rejection_reason ? `Artist application rejected: ${artist.rejection_reason}` : 'Artist application rejected.'
      });
    }

    // Pending verification
    return res.status(403).json({
      status: 'pending',
      message: 'Artist profile is pending verification. It will be visible once approved.'
    });
  } catch (err) {
    next(err);
  }
};