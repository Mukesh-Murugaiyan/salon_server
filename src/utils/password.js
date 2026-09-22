const bcrypt = require('bcryptjs');

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt with 12 salt rounds.
 * @param {string} password
 * @returns {Promise<string>}
 */
const hashPassword = async (password) => {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a valid non-empty string');
  }
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

/**
 * Compares a plaintext password against a bcrypt hash.
 * @param {string} password
 * @param {string} passwordHash
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, passwordHash) => {
  if (!password || !passwordHash) {
    return false;
  }
  return bcrypt.compare(password, passwordHash);
};

module.exports = {
  hashPassword,
  comparePassword,
  BCRYPT_SALT_ROUNDS,
};
