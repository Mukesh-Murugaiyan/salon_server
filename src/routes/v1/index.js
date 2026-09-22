const express = require('express');
const healthRoutes = require('../health.routes');
const authRoutes = require('../auth.routes');
const userRoutes = require('../user.routes');
const roleRoutes = require('../role.routes');
const staffRoutes = require('../staff.routes');
const serviceRoutes = require('../service.routes');
const clientRoutes = require('../client.routes');
const dashboardRoutes = require('../dashboard.routes');
const adminDashboardRoutes = require('../adminDashboard.routes');

const v1Router = express.Router();

// V1 API Resource Routing
v1Router.use('/health', healthRoutes);
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/roles', roleRoutes);
v1Router.use('/staff', staffRoutes);
v1Router.use('/services', serviceRoutes);
v1Router.use('/clients', clientRoutes);
v1Router.use('/dashboard', dashboardRoutes);
v1Router.use('/admin', adminDashboardRoutes);

module.exports = v1Router;
