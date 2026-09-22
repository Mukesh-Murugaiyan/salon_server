/**
 * Server-Authoritative Tenant Isolation Utility
 *
 * CRITICAL TENANT ISOLATION RULE:
 * This helper strictly extracts companyId from req.user (derived from the verified JWT and populated active DB user).
 * It NEVER trusts or reads req.body.companyId, req.query.companyId, or req.params.companyId.
 */

/**
 * Extracts the authoritative companyId from the authenticated user context.
 *
 * @param {Object} req - Express request object
 * @returns {string|null} - The authenticated companyId
 */
const getCompanyIdFromUser = (req) => {
  if (!req || !req.user) {
    return null;
  }
  return req.user.companyId || null;
};

/**
 * Backwards compatibility helper for existing legacy references
 */
const getSalonIdFromUser = (req) => {
  return getCompanyIdFromUser(req);
};

module.exports = {
  getCompanyIdFromUser,
  getSalonIdFromUser,
};
