const { User } = require('../models/user.model');
const { comparePassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { toSafeUser } = require('../utils/serializer');

class AuthService {
  /**
   * Authenticates user via email and password, dynamically loading Company, Role, and Permissions.
   *
   * @param {string} rawEmail - Plain email string
   * @param {string} password - Plain password string
   * @returns {Promise<{ user: Object, token: string }>}
   */
  async login(rawEmail, password) {
    const normalizedEmail = (rawEmail || '').trim().toLowerCase();

    // Find user with passwordHash
    const user = await User.findOne({ email: normalizedEmail })
      .select('+passwordHash')
      .populate('companyId')
      .populate('roleId');

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

    // Check user account status
    if (!user.isActive) {
      const err = new Error('Your account is disabled. Please contact the administrator.');
      err.status = 403;
      err.code = 'ACCOUNT_DISABLED';
      throw err;
    }

    // Check company status
    if (user.companyId && !user.companyId.isActive) {
      const err = new Error('Your company account is disabled. Please contact support.');
      err.status = 403;
      err.code = 'COMPANY_DISABLED';
      throw err;
    }

    // Check role status
    if (user.roleId && !user.roleId.isActive) {
      const err = new Error('Your assigned role is inactive. Please contact the administrator.');
      err.status = 403;
      err.code = 'ROLE_DISABLED';
      throw err;
    }

    const companyIdStr = user.companyId ? user.companyId._id.toString() : null;
    const roleIdStr = user.roleId ? user.roleId._id.toString() : null;

    // Generate JWT containing identifiers: userId, companyId, roleId
    const token = signToken({
      userId: user._id.toString(),
      companyId: companyIdStr,
      roleId: roleIdStr,
      // Compatibility alias
      salonId: companyIdStr,
    });

    return {
      user: toSafeUser(user),
      token,
    };
  }

  /**
   * Retrieves sanitized profile of currently authenticated user with loaded Company & Role.
   *
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getCurrentUser(userId) {
    const user = await User.findById(userId)
      .populate('companyId')
      .populate('roleId');

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
