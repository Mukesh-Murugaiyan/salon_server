/**
 * Dynamic Permission-Based Authorization Middleware
 *
 * Checks that the authenticated user's assigned role contains the required permission.
 * Format: `${module}:${action}` (e.g., 'users:create', 'appointments:view')
 */
const requirePermission = (moduleName, actionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const requiredPermission = `${moduleName}:${actionName}`.toLowerCase();
    const userPermissions = (req.user.permissions || []).map((p) => p.toLowerCase());

    const hasAccess = userPermissions.includes(requiredPermission);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

/**
 * Middleware that allows access if user has ANY of the specified permission tuples/strings.
 * e.g., requireAnyPermission(['appointments:view', 'appointments:create'])
 */
const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required.',
      });
    }

    const userPermissions = (req.user.permissions || []).map((p) => p.toLowerCase());
    const hasAny = permissions.some((perm) => {
      const normalized = (typeof perm === 'string' ? perm : `${perm.module}:${perm.action}`).toLowerCase();
      return userPermissions.includes(normalized);
    });

    if (!hasAny) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
};
