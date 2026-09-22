const { User } = require('../models/user.model');
const { comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { toSafeUser } = require('../utils/serializer');

class AuthService {
  /**
   * Authenticates user via email and password.
   *
   * @param {string} rawEmail - Plain email string
   * @param {string} password - Plain password string
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async login(rawEmail, password) {
    const normalizedEmail = (rawEmail || '').trim().toLowerCase();

    // Find user with passwordHash explicitly selected
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    // Verify password hash
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    // Check account status
    if (!user.isActive) {
      const err = new Error('Your account is disabled. Please contact the administrator.');
      err.status = 403;
      err.code = 'ACCOUNT_DISABLED';
      throw err;
    }

    // Generate JWT token containing only identity/authorization context
    const token = signToken({
      userId: user._id.toString(),
      role: user.role,
      salonId: user.salonId ? user.salonId.toString() : null,
    });

    return {
      user: toSafeUser(user),
      token,
    };
  }

  /**
   * Retrieves sanitized profile of currently authenticated user.
   *
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId);

    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (!user.isActive) {
      const err = new Error('Your account is disabled. Please contact the administrator.');
      err.status = 403;
      err.code = 'ACCOUNT_DISABLED';
      throw err;
    }

    return toSafeUser(user);
  }
}

module.exports = new AuthService();
