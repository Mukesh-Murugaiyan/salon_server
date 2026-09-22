/**
 * Validates login request payload.
 * Enforces email & password presence without revealing field-specific error details
 * that could aid attackers.
 * Normalizes email before database queries.
 *
 * @param {Object} reqBody
 * @returns {{ isValid: boolean, error?: { error: string, message: string }, normalizedEmail?: string, password?: string }}
 */
const validateLoginInput = (reqBody = {}) => {
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

  // Basic format check
  const trimmedEmail = email.trim().toLowerCase();
  const emailRegex = /^\S+@\S+\.\S+$/;
  if (!emailRegex.test(trimmedEmail)) {
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
};

module.exports = {
  validateLoginInput,
};
