const { ROLES } = require('../models/user.model');

/**
 * Extracts the authoritative salonId from the authenticated user context.
 *
 * CRITICAL TENANT ISOLATION RULE:
 * This helper strictly extracts salonId from req.user (derived from the verified JWT / DB user).
 * It NEVER reads req.body.salonId, req.query.salonId, or req.params.salonId.
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - The authenticated salonId for tenant-scoped users, or null for SUPER_ADMIN
 */
const getSalonIdFromUser = (req) => {
  if (!req || !req.user) {
    return null;
  }

  if (req.user.role === ROLES.SUPER_ADMIN) {
    return null;
  }

  return req.user.salonId || null;
};

module.exports = {
  getSalonIdFromUser,
};
