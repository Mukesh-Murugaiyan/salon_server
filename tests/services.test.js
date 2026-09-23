const { hashPassword, comparePassword } = require('../src/utils/password');
const { signToken, verifyToken } = require('../src/utils/jwt');
const { getSalonIdFromUser, getCompanyIdFromUser } = require('../src/utils/tenant');
const { getAllPermissionStrings, MODULES, ACTIONS } = require('../src/constants/permissions');

describe('Server Core Utilities Unit Tests', () => {
  describe('Password Utility', () => {
    it('hashes and compares passwords securely with bcrypt', async () => {
      const plain = 'StrongPass@2026';
      const hash = await hashPassword(plain);

      expect(hash).not.toBe(plain);
      expect(hash).toMatch(/^\$2[aby]\$/);

      const isValid = await comparePassword(plain, hash);
      expect(isValid).toBe(true);

      const isInvalid = await comparePassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe('JWT Utility', () => {
    it('signs and verifies tokens with required payload claims', () => {
      const payload = {
        userId: '507f1f77bcf86cd799439011',
        role: 'OWNER',
        roleId: '507f1f77bcf86cd799439022',
        salonId: '507f1f77bcf86cd799439033',
      };

      const token = signToken(payload);
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.roleId).toBe(payload.roleId);
      expect(decoded.salonId).toBe(payload.salonId);
    });
  });

  describe('Tenant Utility', () => {
    it('extracts salonId correctly from request user', () => {
      const ownerReq = { user: { salonId: 'salon-123', role: { code: 'OWNER' } } };
      expect(getSalonIdFromUser(ownerReq)).toBe('salon-123');
      expect(getCompanyIdFromUser(ownerReq)).toBe('salon-123');

      const adminReq = { user: { salonId: null, role: { code: 'SUPER_ADMIN' } } };
      expect(getSalonIdFromUser(adminReq)).toBeNull();
      expect(getCompanyIdFromUser(adminReq)).toBeNull();

      expect(getSalonIdFromUser(null)).toBeNull();
      expect(getSalonIdFromUser({})).toBeNull();
    });
  });

  describe('Permission Catalog Utility', () => {
    it('returns all system permission strings formatted as module:action', () => {
      const perms = getAllPermissionStrings();
      expect(Array.isArray(perms)).toBe(true);
      expect(perms.length).toBeGreaterThan(10);
      expect(perms).toContain(`${MODULES.USERS}:${ACTIONS.VIEW}`);
      expect(perms).toContain(`${MODULES.APPOINTMENTS}:${ACTIONS.CREATE}`);
      expect(perms).toContain(`${MODULES.CLIENTS}:${ACTIONS.UPDATE}`);
    });
  });
});
