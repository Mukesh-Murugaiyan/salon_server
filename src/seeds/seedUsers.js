const { connectDB, disconnectDB } = require('../config/db');
const Company = require('../models/company.model');
const Role = require('../models/role.model');
const { User } = require('../models/user.model');
const { getAllPermissionStrings } = require('../constants/permissions');
const { hashPassword } = require('../utils/password');

/**
 * Idempotent seed script for Salon CRM (Ticket 3 - Dynamic RBAC).
 *
 * Seed Execution Hierarchy:
 * 1. Create Company
 *         ↓
 * 2. Create Role for that Company
 *         ↓
 * 3. Create Super Admin User referencing Company + Role
 *
 * Creates ONLY the initial required entities:
 * 1 Company → 1 Role → 1 Super Admin User
 */
const seedDatabase = async (options = {}) => {
  const shouldDisconnect = options.shouldDisconnect !== undefined ? options.shouldDisconnect : require.main === module;

  if (process.env.NODE_ENV !== 'test') {
    console.log('====================================================');
    console.log('🌱 Starting Dynamic DB Seeding (Ticket 3 - DB Driven RBAC)...');
    console.log('====================================================');
  }

  try {
    await connectDB();

    // 1. Create or Find Company
    const companyName = process.env.SEED_COMPANY_NAME || 'Demo Company';
    const companyCode = (process.env.SEED_COMPANY_CODE || 'DEMO').toUpperCase();

    let company = await Company.findOne({ code: companyCode });
    if (!company) {
      company = await Company.create({
        name: companyName,
        code: companyCode,
        isActive: true,
      });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Created Company: ${company.name} [Code: ${company.code}] (${company._id})`);
      }
    } else {
      company.name = companyName;
      company.isActive = true;
      await company.save();
      if (process.env.NODE_ENV !== 'test') {
        console.log(`ℹ️  Existing Company updated: ${company.name} [Code: ${company.code}] (${company._id})`);
      }
    }

    // 2. Create or Find Super Admin Role for that Company
    const roleName = process.env.SEED_ROLE_NAME || 'Super Admin';
    const roleCode = (process.env.SEED_ROLE_CODE || 'SUPER_ADMIN').toUpperCase();
    const allPermissions = getAllPermissionStrings();

    let role = await Role.findOne({ companyId: company._id, code: roleCode });
    if (!role) {
      role = await Role.create({
        companyId: company._id,
        name: roleName,
        code: roleCode,
        description: 'Super Administrator with full dynamic system permissions',
        isActive: true,
        permissions: allPermissions,
      });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Created Role: ${role.name} [Code: ${role.code}] with ${allPermissions.length} permissions`);
      }
    } else {
      role.name = roleName;
      role.permissions = allPermissions;
      role.isActive = true;
      await role.save();
      if (process.env.NODE_ENV !== 'test') {
        console.log(`ℹ️  Updated Role: ${role.name} [Code: ${role.code}] with ${allPermissions.length} permissions`);
      }
    }

    // 3. Create or Find Super Admin User
    const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@example.com').toLowerCase().trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.SEED_ADMIN_NAME || 'Platform Administrator';
    const passwordHash = await hashPassword(adminPassword);

    let user = await User.findOne({ email: adminEmail });
    if (!user) {
      user = await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash,
        companyId: company._id,
        roleId: role._id,
        isActive: true,
      });
      if (process.env.NODE_ENV !== 'test') {
        console.log(`✅ Created Super Admin User: ${user.email} (${user._id})`);
      }
    } else {
      user.name = adminName;
      user.passwordHash = passwordHash;
      user.companyId = company._id;
      user.roleId = role._id;
      user.isActive = true;
      await user.save();
      if (process.env.NODE_ENV !== 'test') {
        console.log(`ℹ️  Updated Super Admin User: ${user.email} (${user._id})`);
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log('====================================================');
      console.log('🎉 Seeding completed successfully! (1 Company → 1 Role → 1 User)');
      console.log('Credentials:');
      console.log(`  - Company: ${company.name} [${company.code}]`);
      console.log(`  - Role   : ${role.name} [${role.code}]`);
      console.log(`  - User   : ${user.email} / ${adminPassword}`);
      console.log('====================================================');
    }

    return { company, role, user };
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
