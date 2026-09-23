const { User } = require('../models/user.model');
const Role = require('../models/role.model');
const { hashPassword } = require('../utils/password');
const { toSafeUser } = require('../utils/serializer');

class UserService {
  /**
   * Retrieves a list of users strictly scoped to the authenticated user's salon.
     /**
   * Retrieves a list of users strictly scoped to the authenticated user's salon,
   * or all users / filtered by salonId if Super Admin (salonId == null).
   *
   * @param {string|null} salonId - Authoritative salonId or null for Super Admin
   * @param {Object} [filter={}] - Query filters
   * @returns {Promise<Array<Object>>} Sanitized user list
   */
  async getUsers(salonId, filter = {}) {
    const query = {};

    if (salonId) {
      query.salonId = salonId;
    } else if (filter.salonId) {
      query.salonId = filter.salonId;
    }

    if (filter.roleId) {
      query.roleId = filter.roleId;
    }

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive === 'true' || filter.isActive === true;
    }

    if (filter.search && filter.search.trim()) {
      const searchRegex = new RegExp(filter.search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
      ];
    }

    const users = await User.find(query)
      .populate('salonId')
      .populate('roleId')
      .sort({ createdAt: -1 });

    return users.map(toSafeUser);
  }

  /**
   * Retrieves a single user by ID strictly within the salon boundary (or globally for Super Admin).
   *
   * @param {string} targetUserId
   * @param {string|null} salonId
   * @returns {Promise<Object>}
   */
  async getUserById(targetUserId, salonId) {
    const user = await User.findById(targetUserId)
      .populate('salonId')
      .populate('roleId');

    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (salonId && user.salonId && user.salonId._id.toString() !== salonId.toString()) {
      const err = new Error('Access denied to user in different salon.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return toSafeUser(user);
  }

  /**
   * Creates a new user in the target salon, validating role assignment.
   *
   * @param {string|null} salonId - Authoritative salonId (or target salonId selected by Super Admin)
   * @param {Object} payload - { name, email, password, roleId, isActive, salonId }
   * @returns {Promise<Object>} Created safe user
   */
  async createUser(salonId, payload) {
    const { name, email, password, isActive } = payload;
    let resolvedRoleId = payload.roleId;

    if (!resolvedRoleId && payload.role) {
      const Role = require('../models/role.model');
      const foundRole = await Role.findOne({
        $or: [{ code: payload.role }, { name: payload.role }],
      });
      if (foundRole) {
        resolvedRoleId = foundRole._id.toString();
      }
    }

    const targetSalonId = salonId || payload.salonId || null;

    if (!name || !email || !password || !resolvedRoleId) {
      const err = new Error('Name, email, password, and role are required.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const Role = require('../models/role.model');
    const roleDoc = await Role.findById(resolvedRoleId);
    if (!roleDoc) {
      const err = new Error('Selected role does not exist.');
      err.status = 400;
      err.code = 'INVALID_ROLE';
      throw err;
    }

    if (salonId && roleDoc.code === 'SUPER_ADMIN') {
      const err = new Error('Owners cannot create Super Admin users.');
      err.status = 403;
      err.code = 'FORBIDDEN';
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

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      salonId: targetSalonId,
      roleId: resolvedRoleId,
      isActive: isActive !== undefined ? isActive : true,
    });

    const populatedUser = await User.findById(newUser._id)
      .populate('salonId')
      .populate('roleId');

    return toSafeUser(populatedUser);
  }

  /**
   * Updates an existing user within the salon boundary (or globally for Super Admin).
   *
   * @param {string} targetUserId
   * @param {string|null} salonId - Authoritative caller salonId (null if Super Admin)
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateUser(targetUserId, salonId, updates) {
    const query = { _id: targetUserId };
    if (salonId) {
      query.salonId = salonId;
    }

    const user = await User.findOne(query);
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

    // Super Admin can update salonId
    if (!salonId && updates.salonId !== undefined) {
      user.salonId = updates.salonId || null;
    }

    if (updates.roleId) {
      const effectiveSalon = salonId || user.salonId || null;
      const roleQuery = { _id: updates.roleId };
      if (effectiveSalon) {
        roleQuery.$or = [{ salonId: effectiveSalon }, { salonId: null }];
      }
      const role = await Role.findOne(roleQuery);
      if (!role) {
        const err = new Error('Selected role does not exist.');
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
      .populate('salonId')
      .populate('roleId');

    return toSafeUser(populatedUser);
  }

  /**
   * Deactivates a user (preserving historical records per architecture).
   *
   * @param {string} targetUserId
   * @param {string|null} salonId
   * @returns {Promise<Object>}
   */
  async deleteUser(targetUserId, salonId) {
    const query = { _id: targetUserId };
    if (salonId) {
      query.salonId = salonId;
    }

    const user = await User.findOne(query);
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
