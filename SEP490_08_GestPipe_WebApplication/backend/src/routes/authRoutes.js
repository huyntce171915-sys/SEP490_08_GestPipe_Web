const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes
router.post('/login', authController.login);
router.post('/forgot-password', authController.sendForgotPasswordOTP);
router.post('/verify-otp', authController.verifyForgotPasswordOTP);
router.post('/reset-password', authController.resetForgotPassword);

// Protected routes (require authentication)
router.post('/change-password', protect, authController.changePassword);
router.put('/profile', protect, authController.updateProfile);
router.get('/me', protect, authController.getCurrentAdmin);

module.exports = router;
