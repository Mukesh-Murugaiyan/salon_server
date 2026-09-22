/**
 * Server-Authoritative Tenant Isolation Utility
 *
 * CRITICAL TENANT ISOLATION RULE:
 * This helper strictly extracts salonId from req.user (derived from the verified JWT and populated active DB user).
 * It NEVER trusts or reads req.body.salonId, req.query.salonId, or req.params.salonId.
 */

/**
 * Extracts the authoritative salonId from the authenticated user context.
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - The authenticated salonId
 */
const getSalonIdFromUser = (req) => {
  if (!req || !req.user) {
    return null;
  }
  return req.user.salonId || null;
};

/**
 * Backwards compatibility helper for existing legacy references
 */
const getCompanyIdFromUser = (req) => {
  return getSalonIdFromUser(req);
};

module.exports = {
  getCompanyIdFromUser,
  getSalonIdFromUser,
};
