const { setupTestDB } = require('./setup');
const seedDatabase = require('../src/seeds/seedUsers');
const { User, ROLES } = require('../src/models/user.model');
const Salon = require('../src/models/salon.model');

setupTestDB();

describe('Idempotent Database Seed Script Tests', () => {
  it('should seed database and verify exactly 4 users and 1 salon exist without duplicates on rerun', async () => {
    // First run
    await seedDatabase();

    const salonCountFirst = await Salon.countDocuments();
    const userCountFirst = await User.countDocuments();

    expect(salonCountFirst).toBe(1);
    expect(userCountFirst).toBe(4);

    // Second run (Idempotency test)
    await seedDatabase();

    const salonCountSecond = await Salon.countDocuments();
    const userCountSecond = await User.countDocuments();

    expect(salonCountSecond).toBe(1);
    expect(userCountSecond).toBe(4);

    // Verify role distribution
    const superAdmins = await User.find({ role: ROLES.SUPER_ADMIN });
    expect(superAdmins).toHaveLength(1);
    expect(superAdmins[0].salonId).toBeNull();

    const owners = await User.find({ role: ROLES.OWNER });
    expect(owners).toHaveLength(2); // owner + disabled

    const receptionists = await User.find({ role: ROLES.RECEPTIONIST });
    expect(receptionists).toHaveLength(1);
  });
});
