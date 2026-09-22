/**
 * System Permission Modules, Actions & Matrix Catalog
 * 
 * Dynamic RBAC Architecture:
 * - Module (Resource): The entity or functional area
 * - Action: The permitted operation (VIEW, CREATE, UPDATE, DELETE)
 * - Permission String: `${module}:${action}` (e.g., 'staff:create', 'clients:view')
 */

const MODULES = {
  USERS: 'users',
  ROLES: 'roles',
  STAFF: 'staff',
  APPOINTMENTS: 'appointments',
  CLIENTS: 'clients',
  SUBSCRIPTION: 'subscription',
  DASHBOARD: 'dashboard',
  COMPANIES: 'companies',
  PLANS: 'plans',
  SERVICES: 'services',
};

const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
};

/**
 * Metadata catalog describing the permission schema for UI matrices and seed generation.
 */
const PERMISSION_CATALOG = [
  {
    module: MODULES.STAFF,
    label: 'Staff',
    description: 'Manage stylists, service specialists, and salon employees',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
  },
  {
    module: MODULES.SERVICES,
    label: 'Services',
    description: 'Salon service catalog, durations, and pricing',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
  },
  {
    module: MODULES.CLIENTS,
    label: 'Clients',
    description: 'Client records, profiles, and history',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
  },
  {
    module: MODULES.APPOINTMENTS,
    label: 'Appointments',
    description: 'Booking, scheduling, and calendar management',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
  },
  {
    module: MODULES.USERS,
    label: 'Users',
    description: 'Manage system login accounts and company users',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
  },
  {
    module: MODULES.ROLES,
    label: 'Roles & Permissions',
    description: 'Manage security roles and permission assignments',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE, ACTIONS.DELETE],
  },
  {
    module: MODULES.SUBSCRIPTION,
    label: 'Subscription',
    description: 'Billing, tiers, and subscription management',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE],
  },
  {
    module: MODULES.DASHBOARD,
    label: 'Dashboard',
    description: 'Access main operational dashboard and metrics',
    actions: [ACTIONS.VIEW],
  },
  {
    module: MODULES.COMPANIES,
    label: 'Companies',
    description: 'Company profiles and settings',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE],
  },
  {
    module: MODULES.PLANS,
    label: 'Plans',
    description: 'Subscription plans and pricing',
    actions: [ACTIONS.VIEW, ACTIONS.CREATE, ACTIONS.UPDATE],
  },
];

/**
 * Returns a flattened array of all available permission strings in the system.
 * e.g., ['staff:view', 'staff:create', ..., 'plans:update']
 */
const getAllPermissionStrings = () => {
  const permissions = [];
  PERMISSION_CATALOG.forEach((item) => {
    item.actions.forEach((action) => {
      permissions.push(`${item.module}:${action}`);
    });
  });
  return permissions;
};

module.exports = {
  MODULES,
  ACTIONS,
  PERMISSION_CATALOG,
  getAllPermissionStrings,
};
