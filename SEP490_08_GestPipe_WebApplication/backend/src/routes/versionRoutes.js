const express = require('express');
const router = express.Router();
const { getAllVersions, getVersionDetail } = require('../controllers/versionController');

// Import middleware đúng đường dẫn và tên export
const { protect, authorize } = require('../middlewares/authMiddleware');

router.get('/version-all', getAllVersions);
router.get('/version/:id', getVersionDetail);

module.exports = router;