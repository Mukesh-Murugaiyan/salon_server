const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/login', (req, res, next) => authController.login(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));

module.exports = router;
