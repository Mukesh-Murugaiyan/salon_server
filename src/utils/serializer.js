/**
 * Serializes a Mongoose User document or plain user object into a safe public representation.
 * Strips passwordHash, __v, and includes Salon, Role, and Permissions.
 *
 * @param {Object} user - User document or object
 * @returns {Object} Safe user object
 */
const toSafeUser = (user) => {
  if (!user) return null;

  const salonId = user.salonId && user.salonId._id
    ? user.salonId._id.toString()
    : (user.salonId ? user.salonId.toString() : null);

  const salon = user.salonId && typeof user.salonId === 'object' && user.salonId._id
    ? {
        id: user.salonId._id.toString(),
        name: user.salonId.name,
        code: user.salonId.code,
        openingTime: user.salonId.openingTime || '09:00',
        closingTime: user.salonId.closingTime || '20:00',
      }
    : salonId;

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
    salonId,
    salon,
    roleId,
    role,
    permissions,
    isActive: user.isActive !== undefined ? user.isActive : true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

module.exports = {
  toSafeUser,
};
