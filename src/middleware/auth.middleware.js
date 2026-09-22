const { verifyToken } = require('../utils/jwt');
const { User } = require('../models/user.model');

/**
 * Authentication middleware.
 * Verifies JWT token and checks database to ensure user is active and exists.
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
    // Check database to ensure user still exists and is currently active
    const user = await User.findById(decoded.userId);

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

    // Attach verified user context to request
    req.user = {
      id: user._id.toString(),
      role: user.role,
      salonId: user.salonId ? user.salonId.toString() : null,
      email: user.email,
      name: user.name,
    };

    next();
  } catch (dbError) {
    next(dbError);
  }
};

module.exports = {
  authenticate,
};
