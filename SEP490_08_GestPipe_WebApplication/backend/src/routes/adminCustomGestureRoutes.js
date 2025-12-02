const express = require('express');
const router = express.Router();
const adminCustomGestureController = require('../controllers/adminCustomGestureController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Submit for approval - cho admin và superadmin
router.post('/submit', protect, authorize('admin', 'superadmin'), adminCustomGestureController.submitForApproval);

// Get admin status - cho admin xem status của mình
router.get('/status', protect, authorize('admin'), adminCustomGestureController.getAdminStatus);

// Get pending requests - chỉ superadmin
router.get('/pending', protect, authorize('superadmin'), adminCustomGestureController.getPendingRequests);

// Get all requests - chỉ superadmin
router.get('/all', protect, authorize('superadmin'), adminCustomGestureController.getAllRequests);

// Approve request - chỉ superadmin
router.put('/approve/:id', protect, authorize('superadmin'), adminCustomGestureController.approveRequest);

// Reject request - chỉ superadmin
router.put('/reject/:id', protect, authorize('superadmin'), adminCustomGestureController.rejectRequest);

// Test route
router.get('/test-reject', adminCustomGestureController.testReject);

module.exports = router;