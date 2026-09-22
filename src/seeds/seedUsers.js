const { connectDB, disconnectDB } = require('../config/db');
const Role = require('../models/role.model');
const { User } = require('../models/user.model');
const { getAllPermissionStrings } = require('../constants/permissions');
const { hashPassword } = require('../utils/password');

/**
 * Idempotent seed script for Salon CRM.
 *
 * Seed Execution Hierarchy:
 * 1. Create Super Admin Role (salonId = null)
 *         ↓
 * 2. Create Super Admin User (salonId = null)
 *
 * Creates ONLY the initial required entities.
 * No Salon is seeded globally. Salons are created dynamically later.
 */
const seedDatabase = async (options = {}) => {
  const shouldDisconnect = options.shouldDisconnect !== undefined ? options.shouldDisconnect : require.main === module;

  if (process.env.NODE_ENV !== 'test') {
    console.log('====================================================');
    console.log('🌱 Starting Dynamic DB Seeding (Tenant Refactor)...');
    console.log('====================================================');
  }

  try {
    await connectDB();

    // 1. Create or Find Super Admin Role (Global, salonId = null)
    const roleName = process.env.SEED_ROLE_NAME || 'Super Admin';
    const roleCode = (process.env.SEED_ROLE_CODE || 'SUPER_ADMIN').toUpperCase();
    const allPermissions = getAllPermissionStrings();

    let role = await Role.findOne({ salonId: null, code: roleCode });
    if (!role) {
      role = await Role.create({
        salonId: null,
        name: roleName,
        code: roleCode,
        description: 'Global Super Administrator with full system permissions',
        isActive: true,
        permissions: allPermissions,
      });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Created Role: ${role.name} [Code: ${role.code}] with ${allPermissions.length} permissions`);
      }
    } else {
      role.name = roleName;
      role.permissions = allPermissions;
      role.isActive = true;
      await role.save();
      if (process.env.NODE_ENV !== 'test') {
        console.log(`  Updated Role: ${role.name} [Code: ${role.code}] with ${allPermissions.length} permissions`);
      }
    }

    // 2. Create or Find Super Admin User (Global, salonId = null)
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'superadmin@salon.com').toLowerCase().trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.SEED_ADMIN_NAME || 'Super Admin';
    const passwordHash = await hashPassword(adminPassword);

    let user = await User.findOne({ email: adminEmail });
    if (!user) {
      user = await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        salonId: null,
        roleId: role._id,
        isActive: true,
      });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`Created Super Admin User: ${user.email} (${user._id})`);
      }
    } else {
      user.name = adminName;
      user.passwordHash = passwordHash;
      user.salonId = null;
      user.roleId = role._id;
      user.isActive = true;
      await user.save();
      if (process.env.NODE_ENV !== 'test') {
        console.log(`  Updated Super Admin User: ${user.email} (${user._id})`);
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log('====================================================');
      console.log('🎉 Seeding completed successfully! (1 Role → 1 User)');
      console.log('Credentials:');
      console.log(`  - Role   : ${role.name} [${role.code}] (Global)`);
      console.log(`  - User   : ${user.email} / ${adminPassword}`);
      console.log('====================================================');
    }

    return { role, user };
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('❌ Seeding failed with error:', error);
      process.exit(1);
    }
    throw error;
  } finally {
    if (shouldDisconnect) {
      await disconnectDB();
    }
  }
};

if (require.main === module) {
  seedDatabase().then(() => process.exit(0));
}

module.exports = seedDatabase;
