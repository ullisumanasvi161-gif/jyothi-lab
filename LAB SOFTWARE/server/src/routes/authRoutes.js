const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');

const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authController.register); // Public for initial setup, otherwise admin-controlled
router.post('/login', rateLimiter, authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
