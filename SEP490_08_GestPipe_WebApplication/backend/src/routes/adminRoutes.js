const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All routes require authentication and SuperAdmin role
router.post('/create', protect, authorize('superadmin'), adminController.createAdmin);
router.get('/list', protect, authorize('superadmin'), adminController.getAllAdmins);
router.put('/toggle-status/:id', protect, authorize('superadmin'), adminController.toggleAdminStatus);

// Get profile - Both admin and superadmin can view their own profile
router.get('/profile/:id', protect, adminController.getProfile);

// Update profile - Both admin and superadmin can update their own profile
router.put('/update-profile/:id', protect, adminController.updateProfile);

// Approve gesture request - SuperAdmin only
router.post('/approve-gesture/:userId', protect, authorize('superadmin'), adminController.approveGestureRequest);

// Delete admin - Must be after other routes to avoid route conflict
router.delete('/:id', protect, authorize('superadmin'), adminController.deleteAdmin);

module.exports = router;
