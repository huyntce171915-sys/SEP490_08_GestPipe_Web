const express = require('express');
const router = express.Router();
const { getAllUsers, getUserDetail, lockUser, unlockUser} = require('../controllers/userController');

// Import middleware đúng đường dẫn và tên export
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/user-all', protect, authorize('admin', 'superadmin'), getAllUsers);
router.get('/user/:id', protect, authorize('admin', 'superadmin'), getUserDetail);
router.post('/user/:id/lock', protect, authorize('admin', 'superadmin'), lockUser);
router.post('/user/:id/unlock', protect, authorize('admin', 'superadmin'), unlockUser);

module.exports = router;