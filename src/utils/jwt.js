const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Signs a JWT with minimal, non-sensitive authorization context.
 * @param {Object} payload
 * @param {string} payload.userId - The user's ID
 * @param {string} payload.role - The user's role (SUPER_ADMIN, OWNER, RECEPTIONIST)
 * @param {string|null} payload.salonId - The user's tenant ID
 * @returns {string} Signed JWT token
 */
const signToken = (payload) => {
  const safePayload = {
    userId: payload.userId,
    role: payload.role,
    roleId: payload.roleId,
    salonId: payload.salonId || null,
  };

  return jwt.sign(safePayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Verifies a JWT token and returns the decoded payload.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

module.exports = {
  signToken,
  verifyToken,
};
