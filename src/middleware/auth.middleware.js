const { verifyToken } = require('../utils/jwt');
const { User } = require('../models/user.model');

/**
 * Authentication middleware.
 * Verifies JWT token and resolves database User, Company, Role and Permissions.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid or expired authentication token.',
    });
  }

  try {
    // Check database to ensure user still exists and load Company & Role with permissions
    const user = await User.findById(decoded.userId)
      .populate('companyId')
      .populate('roleId');

    if (!user) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: 'ACCOUNT_DISABLED',
        message: 'Your account is disabled. Please contact the administrator.',
      });
    }

    if (user.companyId && !user.companyId.isActive) {
      return res.status(403).json({
        error: 'COMPANY_DISABLED',
        message: 'Your company account is inactive. Please contact support.',
      });
    }

    if (user.roleId && !user.roleId.isActive) {
      return res.status(403).json({
        error: 'ROLE_DISABLED',
        message: 'Your assigned role is currently inactive. Please contact the administrator.',
      });
    }

    const companyIdStr = user.companyId ? user.companyId._id.toString() : null;
    const roleIdStr = user.roleId ? user.roleId._id.toString() : null;

    // Attach verified user context, company, role, and dynamic permissions to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      companyId: companyIdStr,
      company: user.companyId
        ? {
            id: companyIdStr,
            name: user.companyId.name,
            code: user.companyId.code,
          }
        : null,
      roleId: roleIdStr,
      role: user.roleId
        ? {
            id: roleIdStr,
            name: user.roleId.name,
            code: user.roleId.code,
          }
        : null,
      permissions: user.roleId && Array.isArray(user.roleId.permissions) ? user.roleId.permissions : [],
      // Compatibility alias
      salonId: companyIdStr,
    };

    next();
  } catch (dbError) {
    next(dbError);
  }
};

module.exports = {
  authenticate,
};
