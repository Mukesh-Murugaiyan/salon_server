const { connectDB, disconnectDB } = require('../config/db');
const { User, ROLES } = require('../models/user.model');
const Salon = require('../models/salon.model');
const { hashPassword } = require('../utils/password');

/**
 * Idempotent seed script for Salon CRM development & assessment.
 *
 * SECURITY NOTICE:
 * The seeded passwords below are STRICTLY for local development and assessment testing.
 * DO NOT USE THESE PASSWORDS IN ANY PRODUCTION ENVIRONMENT.
 */
const seedDatabase = async (options = {}) => {
  const shouldDisconnect = options.shouldDisconnect !== undefined ? options.shouldDisconnect : require.main === module;

  if (process.env.NODE_ENV !== 'test') {
    console.log('====================================================');
    console.log('🌱 Starting Salon CRM Database Seeding...');
    console.log('====================================================');
  }

  try {
    await connectDB();

    // 1. Upsert Demo Salon
    let demoSalon = await Salon.findOne({ name: 'Luxe Haven Salon & Spa' });
    if (!demoSalon) {
      demoSalon = await Salon.create({
        name: 'Luxe Haven Salon & Spa',
        email: 'contact@luxehaven.com',
        phone: '+1-555-0199',
        address: '742 Evergreen Terrace, Suite 100',
        isActive: true,
      });
      console.log(`✅ Created Demo Salon: ${demoSalon.name} (${demoSalon._id})`);
    } else {
      console.log(`ℹ️  Demo Salon already exists: ${demoSalon.name} (${demoSalon._id})`);
    }

    // 2. Define standard seed users
    const seedUsersData = [
      {
        name: 'Platform Super Admin',
        email: 'admin@saloncrm.com',
        plainPassword: 'Admin@123',
        role: ROLES.SUPER_ADMIN,
        salonId: null,
        isActive: true,
      },
      {
        name: 'Salon Owner',
        email: 'owner@saloncrm.com',
        plainPassword: 'Owner@123',
        role: ROLES.OWNER,
        salonId: demoSalon._id,
        isActive: true,
      },
      {
        name: 'Front Desk Receptionist',
        email: 'receptionist@saloncrm.com',
        plainPassword: 'Receptionist@123',
        role: ROLES.RECEPTIONIST,
        salonId: demoSalon._id,
        isActive: true,
      },
      {
        name: 'Disabled Account User',
        email: 'disabled@saloncrm.com',
        plainPassword: 'Disabled@123',
        role: ROLES.OWNER,
        salonId: demoSalon._id,
        isActive: false,
      },
    ];

    // 3. Upsert users idempotently
    for (const userData of seedUsersData) {
      const normalizedEmail = userData.email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: normalizedEmail });
      const passwordHash = await hashPassword(userData.plainPassword);

      if (!existingUser) {
        await User.create({
          name: userData.name,
          email: normalizedEmail,
          passwordHash,
          role: userData.role,
          salonId: userData.salonId,
          isActive: userData.isActive,
        });
        console.log(`✅ Created User: [${userData.role}] ${normalizedEmail}`);
      } else {
        // Ensure passwordHash and roles are updated to match seed state
        existingUser.name = userData.name;
        existingUser.passwordHash = passwordHash;
        existingUser.role = userData.role;
        existingUser.salonId = userData.salonId;
        existingUser.isActive = userData.isActive;
        await existingUser.save();
        console.log(`ℹ️  Updated existing User: [${userData.role}] ${normalizedEmail}`);
      }
    }

    if (process.env.NODE_ENV !== 'test') {
      console.log('====================================================');
      console.log('🎉 Seeding completed successfully!');
      console.log('⚠️  DEVELOPMENT CREDENTIALS (DO NOT USE IN PRODUCTION):');
      console.log('  - SUPER_ADMIN : admin@saloncrm.com        / Admin@123');
      console.log('  - OWNER       : owner@saloncrm.com        / Owner@123');
      console.log('  - RECEPTIONIST: receptionist@saloncrm.com / Receptionist@123');
      console.log('  - DISABLED    : disabled@saloncrm.com     / Disabled@123');
      console.log('====================================================');
    }
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
