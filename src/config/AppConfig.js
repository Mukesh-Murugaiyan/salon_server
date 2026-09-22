const env = require('./env');

/**
 * AppConfig Class (Backend)
 * Centralizes application-level configuration, operational defaults, and environment access.
 */
class AppConfig {
  static PORT = env.PORT;
  static NODE_ENV = env.NODE_ENV;
  static MONGODB_URI = env.MONGODB_URI;
  static JWT_SECRET = env.JWT_SECRET;
  static JWT_EXPIRES_IN = env.JWT_EXPIRES_IN;
  static WEB_ORIGIN = env.WEB_ORIGIN;
  static isProduction = env.isProduction;
  static isTest = env.isTest;

  /**
   * Default Operating Hours for Salons
   */
  static OPERATING_HOURS = {
    DEFAULT_OPENING_TIME: '09:00',
    DEFAULT_CLOSING_TIME: '20:00',
  };

  /**
   * Geofencing Configuration Defaults
   */
  static GEOFENCING = {
    DEFAULT_ALLOWED_RADIUS_METERS: 100,
  };

  /**
   * System Role Codes
   */
  static ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    OWNER: 'OWNER',
    RECEPTIONIST: 'RECEPTIONIST',
    STAFF: 'STAFF',
  };

  /**
   * Default Subscription Configuration
   */
  static SUBSCRIPTION = {
    TRIAL_DAYS: 14,
    EXPIRING_SOON_THRESHOLD_DAYS: 5,
  };
}

module.exports = AppConfig;
