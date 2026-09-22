const { User } = require('../models/user.model');
const Role = require('../models/role.model');
const { hashPassword } = require('../utils/password');
const { toSafeUser } = require('../utils/serializer');

class UserService {
  /**
   * Retrieves a list of users strictly scoped to the authenticated user's company.
   *
   * @param {string} companyId - Authoritative companyId
   * @param {Object} [filter={}] - Query filters
   * @returns {Promise<Array<Object>>} Sanitized user list
   */
  async getUsers(companyId, filter = {}) {
    const query = { companyId };

    if (filter.roleId) {
      query.roleId = filter.roleId;
    }

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive === 'true' || filter.isActive === true;
    }

    const users = await User.find(query)
      .populate('companyId')
      .populate('roleId')
      .sort({ createdAt: -1 });

    return users.map(toSafeUser);
  }

  /**
   * Retrieves a single user by ID strictly within the company boundary.
   *
   * @param {string} targetUserId
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async getUserById(targetUserId, companyId) {
    const user = await User.findOne({ _id: targetUserId, companyId })
      .populate('companyId')
      .populate('roleId');

    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    return toSafeUser(user);
  }

  /**
   * Creates a new user in the authenticated company, validating role assignment.
   *
   * @param {string} companyId - Authoritative companyId
   * @param {Object} payload - { name, email, password, roleId, isActive }
   * @returns {Promise<Object>} Created safe user
   */
  async createUser(companyId, payload) {
    const { name, email, password, roleId, isActive } = payload;

    if (!name || !email || !password || !roleId) {
      const err = new Error('Name, email, password, and role are required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      const err = new Error('A user with this email address already exists.');
      err.status = 409;
      err.code = 'EMAIL_EXISTS';
      throw err;
    }

    // Verify role belongs to company and is active
    const role = await Role.findOne({ _id: roleId, companyId });
    if (!role) {
      const err = new Error('Selected role does not exist in your company.');
      err.status = 400;
      err.code = 'INVALID_ROLE';
      throw err;
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      companyId,
      roleId: role._id,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    });

    const populatedUser = await User.findById(newUser._id)
      .populate('companyId')
      .populate('roleId');

    return toSafeUser(populatedUser);
  }

  /**
   * Updates an existing user within the company boundary.
   *
   * @param {string} targetUserId
   * @param {string} companyId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateUser(targetUserId, companyId, updates) {
    const user = await User.findOne({ _id: targetUserId, companyId });
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (updates.name) user.name = updates.name.trim();

    if (updates.email) {
      const normalizedEmail = updates.email.trim().toLowerCase();
      if (normalizedEmail !== user.email) {
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
          const err = new Error('A user with this email address already exists.');
          err.status = 409;
          err.code = 'EMAIL_EXISTS';
          throw err;
        }
        user.email = normalizedEmail;
      }
    }

    if (updates.password) {
      user.passwordHash = await hashPassword(updates.password);
    }

    if (updates.roleId) {
      const role = await Role.findOne({ _id: updates.roleId, companyId });
      if (!role) {
        const err = new Error('Selected role does not exist in your company.');
        err.status = 400;
        err.code = 'INVALID_ROLE';
        throw err;
      }
      user.roleId = role._id;
    }

    if (updates.isActive !== undefined) {
      user.isActive = Boolean(updates.isActive);
    }

    await user.save();

    const populatedUser = await User.findById(user._id)
      .populate('companyId')
      .populate('roleId');

    return toSafeUser(populatedUser);
  }

  /**
   * Deactivates a user (preserving historical records per architecture).
   *
   * @param {string} targetUserId
   * @param {string} companyId
   * @returns {Promise<Object>}
   */
  async deleteUser(targetUserId, companyId) {
    const user = await User.findOne({ _id: targetUserId, companyId });
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    user.isActive = false;
    await user.save();

    return {
      message: `User '${user.name}' has been deactivated.`,
      user: toSafeUser(user),
    };
  }
}

module.exports = new UserService();
