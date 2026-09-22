const { User, ROLES } = require('../models/user.model');
const { hashPassword } = require('../utils/password');
const { toSafeUser } = require('../utils/serializer');

class UserService {
  /**
   * Retrieves a list of users scoped to the authenticated tenant.
   * - SUPER_ADMIN: Can view all users (or filter by optional salonId query).
   * - OWNER: Can view all staff/users belonging strictly to their salon.
   * - RECEPTIONIST: Can view colleagues in their salon.
   *
   * @param {Object} context
   * @param {string|null} context.tenantSalonId - Authoritative salonId from req.user
   * @param {string} context.currentUserRole - Role of the requesting user
   * @param {Object} [filter={}] - Optional query filters
   * @returns {Promise<Array<Object>>} List of sanitized user objects
   */
  async getUsers({ tenantSalonId, currentUserRole, filter = {} }) {
    const query = {};

    // Strict tenant boundary enforcement
    if (tenantSalonId) {
      query.salonId = tenantSalonId;
    } else if (currentUserRole === ROLES.SUPER_ADMIN && filter.salonId) {
      // Super admin can optionally filter by salon
      query.salonId = filter.salonId;
    }

    if (filter.role) {
      query.role = filter.role;
    }

    if (filter.isActive !== undefined) {
      query.isActive = filter.isActive === 'true' || filter.isActive === true;
    }

    const users = await User.find(query).sort({ createdAt: -1 });
    return users.map(toSafeUser);
  }

  /**
   * Retrieves a single user by ID with tenant access control.
   *
   * @param {string} targetUserId
   * @param {Object} context
   * @param {string|null} context.tenantSalonId
   * @param {string} context.currentUserRole
   * @returns {Promise<Object>} Sanitized user object
   */
  async getUserById(targetUserId, { tenantSalonId, currentUserRole }) {
    const user = await User.findById(targetUserId);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Tenant check: Non-superadmin can only access users within their own salon
    if (tenantSalonId && user.salonId && user.salonId.toString() !== tenantSalonId.toString()) {
      const err = new Error('You do not have permission to access users from another salon.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    return toSafeUser(user);
  }

  /**
   * Creates a new user with role-based and tenant-based constraints.
   * - OWNER: Can only create staff (e.g. RECEPTIONIST) for their own salon.
   * - SUPER_ADMIN: Can create any role.
   *
   * @param {Object} payload
   * @param {Object} context
   * @param {string|null} context.tenantSalonId
   * @param {string} context.currentUserRole
   * @returns {Promise<Object>} Sanitized created user
   */
  async createUser(payload, { tenantSalonId, currentUserRole }) {
    const { name, email, password, role, salonId: requestedSalonId } = payload;

    if (!email || !password || !name || !role) {
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
      err.code = 'CONFLICT';
      throw err;
    }

    // Determine target salonId server-side
    let targetSalonId = null;
    if (currentUserRole === ROLES.OWNER) {
      // Owner can NEVER create a SUPER_ADMIN and can ONLY create users within their salon
      if (role === ROLES.SUPER_ADMIN || role === ROLES.OWNER) {
        const err = new Error('Owners can only provision staff members (RECEPTIONIST).');
        err.status = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
      targetSalonId = tenantSalonId;
    } else if (currentUserRole === ROLES.SUPER_ADMIN) {
      targetSalonId = role === ROLES.SUPER_ADMIN ? null : requestedSalonId;
    }

    const passwordHash = await hashPassword(password);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      salonId: targetSalonId,
      isActive: true,
    });

    return toSafeUser(newUser);
  }

  /**
   * Updates an existing user with tenant boundary verification.
   *
   * @param {string} targetUserId
   * @param {Object} updates
   * @param {Object} context
   * @param {string|null} context.tenantSalonId
   * @param {string} context.currentUserRole
   * @returns {Promise<Object>} Updated sanitized user
   */
  async updateUser(targetUserId, updates, { tenantSalonId, currentUserRole }) {
    const user = await User.findById(targetUserId);
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    // Tenant boundary check
    if (tenantSalonId && user.salonId && user.salonId.toString() !== tenantSalonId.toString()) {
      const err = new Error('You cannot modify users outside your salon.');
      err.status = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    if (updates.name) user.name = updates.name.trim();
    if (updates.password) {
      user.passwordHash = await hashPassword(updates.password);
    }
    if (updates.isActive !== undefined && currentUserRole !== ROLES.RECEPTIONIST) {
      user.isActive = Boolean(updates.isActive);
    }

    // Only SUPER_ADMIN can change user roles or salonId
    if (currentUserRole === ROLES.SUPER_ADMIN) {
      if (updates.role) user.role = updates.role;
      if (updates.salonId !== undefined) user.salonId = updates.salonId;
    }

    await user.save();
    return toSafeUser(user);
  }

  /**
   * Deactivates/disables a user account.
   *
   * @param {string} targetUserId
   * @param {Object} context
   * @param {string|null} context.tenantSalonId
   * @param {string} context.currentUserRole
   * @returns {Promise<Object>}
   */
  async setUserActiveStatus(targetUserId, isActive, { tenantSalonId, currentUserRole }) {
    return this.updateUser(targetUserId, { isActive }, { tenantSalonId, currentUserRole });
  }
}

module.exports = new UserService();
