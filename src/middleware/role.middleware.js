/**
 * Dynamic role-aware authorization middleware factory.
 * Provides backwards-compatibility while delegating primary authorization to permission-based architecture.
 *
 * @param {...(string|Object|Array)} roles - List or groups of authorized roles
 * @returns {Function} Express middleware function
 */
const authorizeRoles = (...roles) => {
  const flattenedRoles = roles
    .flat(Infinity)
    .map((r) => (r && typeof r === 'object' && r.value ? r.value : r));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const userRoleValue = req.user.role?.code || req.user.role?.name || req.user.role;
    if (!flattenedRoles.includes(userRoleValue)) {
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
