const env = require('../config/env');

/**
 * Centralized API Error Handling Middleware.
 * Ensures consistent JSON response structure and conceals internal details/stack traces.
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'An unexpected error occurred.';

  // Handle Mongoose / MongoDB specific error cases
  if (err.name === 'ValidationError') {
    errorCode = 'VALIDATION_ERROR';
    // Collate Mongoose validation error messages
    const details = Object.values(err.errors).map((e) => e.message);
    message = details.join('; ') || 'Validation error.';
  } else if (err.code === 11000) {
    // Duplicate key error
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'A record with this identifier already exists.',
    });
  } else if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: `Invalid format for field: ${err.path}`,
    });
  }

  // Fallback for uncaught 500 errors
  if (status === 500) {
    if (env.NODE_ENV !== 'test') {
      console.error('[Unhandled Server Error]', err);
    }
    return res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: env.isProduction ? 'An unexpected internal error occurred.' : message,
    });
  }

  return res.status(status).json({
    error: errorCode,
    message,
    ...(err.details && { details: err.details }),
  });
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
