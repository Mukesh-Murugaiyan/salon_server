const mongoose = require('mongoose');

/**
 * Validation Utility Class (Backend)
 * Centralizes input, coordinate, objectId, and payload validations.
 */
class Validation {
  static EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  static PHONE_REGEX = /^\+?[0-9\s\-()]{7,15}$/;

  /**
   * Checks if string is a valid email address format.
   * @param {string} [email]
   * @returns {boolean}
   */
  static isValidEmail(email) {
    if (!email) return false;
    return this.EMAIL_REGEX.test(String(email).trim().toLowerCase());
  }

  /**
   * Checks if a value is a valid phone number.
   * @param {string} [phone]
   * @returns {boolean}
   */
  static isValidPhone(phone) {
    if (!phone) return false;
    return this.PHONE_REGEX.test(String(phone).trim());
  }

  /**
   * Checks if string has non-whitespace characters.
   * @param {*} value
   * @returns {boolean}
   */
  static isNonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Validates geographic coordinates (lat [-90, 90], lon [-180, 180]).
   * @param {number|string} lat
   * @param {number|string} lon
   * @returns {boolean}
   */
  static isValidCoordinates(lat, lon) {
    if (lat === null || lat === undefined || lon === null || lon === undefined) {
      return false;
    }
    const nLat = Number(lat);
    const nLon = Number(lon);
    if (isNaN(nLat) || isNaN(nLon)) return false;
    return nLat >= -90 && nLat <= 90 && nLon >= -180 && nLon <= 180;
  }

  /**
   * Validates MongoDB ObjectId string.
   * @param {string} id
   * @returns {boolean}
   */
  static isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Validates login input payload.
   * @param {Object} [reqBody={}]
   * @returns {{ isValid: boolean, error?: { error: string, message: string }, normalizedEmail?: string, password?: string }}
   */
  static validateLoginInput(reqBody = {}) {
    const { email, password } = reqBody;

    if (
      !email ||
      typeof email !== 'string' ||
      email.trim().length === 0 ||
      !password ||
      typeof password !== 'string' ||
      password.length === 0
    ) {
      return {
        isValid: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: 'Email and password are required.',
        },
      };
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!this.isValidEmail(trimmedEmail)) {
      return {
        isValid: false,
        error: {
          error: 'VALIDATION_ERROR',
          message: 'Email must be a valid email address.',
        },
      };
    }

    return {
      isValid: true,
      normalizedEmail: trimmedEmail,
      password,
    };
  }
}

module.exports = Validation;
