/**
 * Serializes a Mongoose User document or plain user object into a safe public representation.
 * Strips passwordHash, __v, and includes Company, Role, and Permissions.
 *
 * @param {Object} user - User document or object
 * @returns {Object} Safe user object
 */
const toSafeUser = (user) => {
  if (!user) return null;

  const companyId = user.companyId && user.companyId._id
    ? user.companyId._id.toString()
    : (user.companyId ? user.companyId.toString() : null);

  const company = user.companyId && typeof user.companyId === 'object' && user.companyId._id
    ? {
        id: user.companyId._id.toString(),
        name: user.companyId.name,
        code: user.companyId.code,
      }
    : companyId;

  const roleId = user.roleId && user.roleId._id
    ? user.roleId._id.toString()
    : (user.roleId ? user.roleId.toString() : null);

  const role = user.roleId && typeof user.roleId === 'object' && user.roleId._id
    ? {
        id: user.roleId._id.toString(),
        name: user.roleId.name,
        code: user.roleId.code,
      }
    : roleId;

  const permissions = user.roleId && typeof user.roleId === 'object' && Array.isArray(user.roleId.permissions)
    ? user.roleId.permissions
    : [];

  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    companyId,
    company,
    roleId,
    role,
    permissions,
    isActive: user.isActive !== undefined ? user.isActive : true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    salonId: companyId,
  };
};

module.exports = {
  toSafeUser,
};
