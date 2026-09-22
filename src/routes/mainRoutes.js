const express = require('express');
const v1Routes = require('./v1');

const mainRouter = express.Router();

/**
 * API Versioning Architecture:
 * - Version 1 endpoints are mounted at: /api/v1/...
 * - Legacy/default requests without version prefix fallback to /api/v1/...
 * - Future v2 endpoints can be seamlessly mounted at: /api/v2/...
 */

// Route version 1
mainRouter.use('/v1', v1Routes);

// Fallback to v1 for backwards-compatibility
mainRouter.use('/', v1Routes);

module.exports = mainRouter;
