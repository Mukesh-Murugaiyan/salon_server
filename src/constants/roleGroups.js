const { ROLES } = require('./roles');

/**
 * Centralized Role Groups
 */
const ROLE_GROUPS = {
  ADMIN_USERS: [ROLES.SUPER_ADMIN.value],
  SALON_USERS: [ROLES.OWNER.value, ROLES.RECEPTIONIST.value],
  APPOINTMENT_USERS: [ROLES.OWNER.value, ROLES.RECEPTIONIST.value],
  CLIENT_USERS: [ROLES.OWNER.value, ROLES.RECEPTIONIST.value],
  SUBSCRIPTION_VIEWERS: [ROLES.SUPER_ADMIN.value, ROLES.OWNER.value],
};

module.exports = {
  ROLE_GROUPS,
};
