const mongoose = require('mongoose');
const Role = require('../models/role.model');
const { User } = require('../models/user.model');
const { PERMISSION_CATALOG } = require('../constants/permissions');

class RoleService {
  /**
   * Lists all roles belonging to the specified salon with live user counts.
   *
   * @param {string} salonId - Authoritative salonId
   * @returns {Promise<Array>} List of roles with userCount
   */
  async listRoles(salonId) {
    const query = salonId ? { $or: [{ salonId }, { salonId: null }] } : {};
    const roles = await Role.find(query).sort({ createdAt: -1 });

    // Aggregate user counts per role for this salon (or globally for Super Admin)
    const matchQuery = {};
    if (salonId) {
      matchQuery.salonId = mongoose.Types.ObjectId.isValid(salonId)
        ? new mongoose.Types.ObjectId(salonId)
        : salonId;
    }
    const userCounts = await User.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$roleId', count: { $sum: 1 } } },
    ]);

    const countMap = new Map();
    userCounts.forEach((uc) => {
      if (uc._id) {
        countMap.set(uc._id.toString(), uc.count);
      }
    });

    return roles.map((role) => ({
      id: role._id.toString(),
      _id: role._id.toString(),
      name: role.name,
      code: role.code,
      description: role.description || '',
      isActive: role.isActive,
      permissionsCount: (role.permissions || []).length,
      userCount: countMap.get(role._id.toString()) || 0,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  /**
   * Retrieves single role by ID within tenant boundary, along with assigned users.
   *
   * @param {string} roleId
   * @param {string} salonId
   * @returns {Promise<{ role: Object, users: Array }>}
   */
  async getRoleById(roleId, salonId) {
    const roleQuery = salonId ? { _id: roleId, $or: [{ salonId }, { salonId: null }] } : { _id: roleId };
    const role = await Role.findOne(roleQuery);
    if (!role) {
      const err = new Error('Role not found.');
      err.status = 404;
      err.code = 'ROLE_NOT_FOUND';
      throw err;
    }

    const userQuery = salonId ? { roleId: role._id, salonId } : { roleId: role._id };
    const users = await User.find(userQuery)
      .select('name email isActive createdAt')
      .sort({ name: 1 });

    return {
      role: {
        id: role._id.toString(),
        _id: role._id.toString(),
        name: role.name,
        code: role.code,
        description: role.description || '',
        isActive: role.isActive,
        permissions: role.permissions || [],
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      },
      users: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
      catalog: PERMISSION_CATALOG,
    };
  }

  /**
   * Creates a new role strictly bound to the authenticated salon.
   *
   * @param {string} salonId
   * @param {Object} roleData
   * @returns {Promise<Object>}
   */
  async createRole(salonId, roleData) {
    const name = (roleData.name || '').trim();
    const code = (roleData.code || name.replace(/\s+/g, '_')).trim().toUpperCase();
    const description = (roleData.description || '').trim();
    const isActive = roleData.isActive !== undefined ? Boolean(roleData.isActive) : true;
    const permissions = Array.isArray(roleData.permissions) ? roleData.permissions : [];

    if (!name) {
      const err = new Error('Role name is required.');
      err.status = 400;
      err.code = 'INVALID_INPUT';
      throw err;
    }

    const existingRole = await Role.findOne({ salonId, code });
    if (existingRole) {
      const err = new Error(`Role with code '${code}' already exists in your salon.`);
      err.status = 409;
      err.code = 'ROLE_CODE_EXISTS';
      throw err;
    }

    const role = await Role.create({
      salonId,
      name,
      code,
      description,
      isActive,
      permissions,
    });

    return {
      id: role._id.toString(),
      name: role.name,
      code: role.code,
      description: role.description,
      isActive: role.isActive,
      permissions: role.permissions,
      createdAt: role.createdAt,
    };
  }

  /**
   * Updates an existing role's metadata.
   *
   * @param {string} roleId
   * @param {string} salonId
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateRole(roleId, salonId, updateData) {
    const role = await Role.findOne({ _id: roleId, salonId });
    if (!role) {
      const err = new Error('Role not found.');
      err.status = 404;
      err.code = 'ROLE_NOT_FOUND';
      throw err;
    }

    if (updateData.name !== undefined) role.name = updateData.name.trim();
    if (updateData.description !== undefined) role.description = updateData.description.trim();
    if (updateData.isActive !== undefined) role.isActive = Boolean(updateData.isActive);
    if (Array.isArray(updateData.permissions)) role.permissions = updateData.permissions;

    await role.save();

    return {
      id: role._id.toString(),
      name: role.name,
      code: role.code,
      description: role.description,
      isActive: role.isActive,
      permissions: role.permissions,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * Deletes a role if no users are currently assigned to it.
   *
   * @param {string} roleId
   * @param {string} salonId
   */
  async deleteRole(roleId, salonId) {
    const role = await Role.findOne({ _id: roleId, salonId });
    if (!role) {
      const err = new Error('Role not found.');
      err.status = 404;
      err.code = 'ROLE_NOT_FOUND';
      throw err;
    }

    // Check if any users are assigned
    const assignedUsersCount = await User.countDocuments({ roleId: role._id, salonId });
    if (assignedUsersCount > 0) {
      const err = new Error(
        `Cannot delete role '${role.name}' because ${assignedUsersCount} active user(s) are assigned to it. Reassign these users first.`
      );
      err.status = 400;
      err.code = 'ROLE_IN_USE';
      throw err;
    }

    await Role.deleteOne({ _id: role._id, salonId });
    return { message: `Role '${role.name}' deleted successfully.` };
  }

  /**
   * Retrieves role permissions and system catalog schema for the permission matrix.
   *
   * @param {string} roleId
   * @param {string} salonId
   * @returns {Promise<{ roleId: string, permissions: Array, catalog: Array }>}
   */
  async getRolePermissions(roleId, salonId) {
    const role = await Role.findOne({ _id: roleId, salonId });
    if (!role) {
      const err = new Error('Role not found.');
      err.status = 404;
      err.code = 'ROLE_NOT_FOUND';
      throw err;
    }

    return {
      roleId: role._id.toString(),
      roleName: role.name,
      permissions: role.permissions || [],
      catalog: PERMISSION_CATALOG,
    };
  }

  /**
   * Updates permissions assigned to a role.
   *
   * @param {string} roleId
   * @param {string} salonId
   * @param {Array<string>} permissions
   * @returns {Promise<Object>}
   */
  async updateRolePermissions(roleId, salonId, permissions) {
    const role = await Role.findOne({ _id: roleId, salonId });
    if (!role) {
      const err = new Error('Role not found.');
      err.status = 404;
      err.code = 'ROLE_NOT_FOUND';
      throw err;
    }

    if (!Array.isArray(permissions)) {
      const err = new Error('Permissions must be an array of strings.');
      err.status = 400;
      err.code = 'INVALID_INPUT';
      throw err;
    }

    role.permissions = permissions;
    await role.save();

    return {
      roleId: role._id.toString(),
      roleName: role.name,
      permissions: role.permissions,
      message: 'Permissions updated successfully.',
    };
  }
}

module.exports = new RoleService();
