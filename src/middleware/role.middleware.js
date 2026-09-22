/**
 * Role-based authorization middleware factory.
 * Enforces role restrictions for protected routes.
 *
 * @param {...string} allowedRoles - List of authorized roles
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

module.exports = {
  authorizeRoles,
};
