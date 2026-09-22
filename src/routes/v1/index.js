const express = require('express');
const healthRoutes = require('../health.routes');
const authRoutes = require('../auth.routes');
const userRoutes = require('../user.routes');

const v1Router = express.Router();

// V1 API Resource Routing
v1Router.use('/health', healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);

module.exports = v1Router;
