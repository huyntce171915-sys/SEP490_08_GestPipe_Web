const express = require('express');
const router = express.Router();


const gestureController = require('../controllers/gestureController');
const customGestureUploadController = require('../controllers/customGestureUploadController');
const customGestureRequestController = require('../controllers/customGestureRequestController');
const gestureTrainingController = require('../controllers/gestureTrainingController');
const gestureInferenceController = require('../controllers/gestureInferenceController');
const gesturePracticeController = require('../controllers/gesturePracticeController');
const authMiddleware = require('../middlewares/authMiddleware');




// Bảo vệ tất cả route bằng JWT
router.use(authMiddleware.protect);

// Các middleware phân quyền
const allowView = authMiddleware.authorize('admin', 'superadmin');
const onlySuper = authMiddleware.authorize('superadmin');

router.get('/', allowView, gestureController.listSamples);
router.get('/labels', allowView, gestureController.listLabels);
router.get('/stats', allowView, gestureController.stats);
router.get('/templates', allowView, gestureController.getGestureTemplates);
router.get('/model-status', allowView, gestureTrainingController.getModelStatus);
router.get('/model-info', allowView, gestureInferenceController.getModelInfo);
router.get('/model-test', allowView, gestureInferenceController.testModel);

// Route for gesture customization
router.post('/customize', allowView, gestureController.customizeGesture);
router.post('/customize/check-conflict', allowView, customGestureUploadController.checkGestureConflict);
router.post('/customize/upload', allowView, customGestureUploadController.uploadCustomGesture);
router.post('/customize/request', allowView, customGestureRequestController.submitCustomizationRequest);
router.get('/customize/status', allowView, customGestureRequestController.getAdminStatus);
router.get('/customize/requests', onlySuper, customGestureRequestController.listRequests);
router.post('/customize/requests/:id/approve', onlySuper, customGestureRequestController.approveRequest);
router.post('/customize/requests/:id/reject', onlySuper, customGestureRequestController.rejectRequest);

// Practice session routes (cho phép cả admin và superadmin)
router.post('/practice/start', allowView, gesturePracticeController.startPracticeSession);
router.post('/practice/stop', allowView, gesturePracticeController.stopPracticeSession);
router.get('/practice/status', allowView, gesturePracticeController.getSessionStatus);
router.get('/practice/logs', allowView, gesturePracticeController.getSessionLogs);


// Các route training chỉ cho superadmin
router.post('/training', onlySuper, gestureTrainingController.startTraining);
router.get('/training', onlySuper, gestureTrainingController.listRuns);
router.get('/training/:id', onlySuper, gestureTrainingController.getRun);
router.delete('/training/:id', onlySuper, gestureTrainingController.cancelTraining);


const adminGestureRequestController = require('../controllers/adminGestureRequestController');

// Admin Gesture Request routes
router.get('/admin-gesture-requests', allowView, adminGestureRequestController.getAdminGestureRequests);
router.get('/admin-gesture-status', allowView, adminGestureRequestController.getGestureStatuses);
router.post('/admin-gesture-request', allowView, adminGestureRequestController.createOrUpdateRequest);
router.post('/admin-gesture-submit', allowView, adminGestureRequestController.submitForApproval);
router.post('/admin-gesture-send-drive', allowView, adminGestureRequestController.sendToDrive);
router.delete('/admin-gesture-delete', allowView, adminGestureRequestController.deleteAllCustomed);
router.post('/admin-gesture-approve', onlySuper, adminGestureRequestController.approveRequests);
router.post('/admin-gesture-reject', onlySuper, adminGestureRequestController.rejectRequests);
router.post('/admin-gesture-reset-active', allowView, adminGestureRequestController.resetAllToActive);

// Practice prediction route
router.post('/practice/predict', allowView, gestureController.predictGesture);

module.exports = router;
