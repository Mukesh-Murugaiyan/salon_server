const Validation = require('../utils/Validation');

/**
 * Validates login request payload delegating to Validation utility.
 *
 * @param {Object} reqBody
 * @returns {{ isValid: boolean, error?: { error: string, message: string }, normalizedEmail?: string, password?: string }}
 */
const validateLoginInput = (reqBody = {}) => {
  return Validation.validateLoginInput(reqBody);
};

module.exports = {
  validateLoginInput,
};
