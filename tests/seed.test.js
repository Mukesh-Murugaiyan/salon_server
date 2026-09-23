const { setupTestDB } = require('./setup');
const seedDatabase = require('../src/seeds/seedUsers');
const { User, ROLES } = require('../src/models/user.model');
const Salon = require('../src/models/salon.model');

setupTestDB();

describe('Idempotent Database Seed Script Tests', () => {
  it('should seed database and verify exactly 1 super admin user and role exist without duplicates on rerun', async () => {
    // First run
    const resultFirst = await seedDatabase();

    expect(resultFirst.user).toBeDefined();
    expect(resultFirst.role).toBeDefined();

    const userCountFirst = await User.countDocuments();
    expect(userCountFirst).toBe(1);

    const superAdmin = await User.findOne({ email: 'superadmin@salon.com' });
    expect(superAdmin).not.toBeNull();
    expect(superAdmin.salonId).toBeNull();
    expect(superAdmin.roleId.toString()).toBe(resultFirst.role._id.toString());

    // Second run (Idempotency test)
    const resultSecond = await seedDatabase();

    const userCountSecond = await User.countDocuments();
    expect(userCountSecond).toBe(1);
    expect(resultSecond.user._id.toString()).toBe(superAdmin._id.toString());
  });
});
