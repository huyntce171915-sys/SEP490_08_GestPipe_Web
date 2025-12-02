const AdminCustomGesture = require('../models/AdminCustomGesture');
const AdminGestureRequest = require('../models/AdminGestureRequest');
const Admin = require('../models/Admin');
const adminGestureRequestController = require('./adminGestureRequestController');

// Submit for approval - tạo record mới hoặc update existing
exports.submitForApproval = async (req, res) => {
  console.log('[submitForApproval] Request received');
  console.log('[submitForApproval] User from middleware:', req.admin);
  console.log('[submitForApproval] Request body:', req.body);

  try {
    const { adminId, gestures } = req.body;
    console.log('[submitForApproval] Extracted data:', { adminId, gestures });

    if (!adminId) {
      console.log('[submitForApproval] Missing adminId');
      return res.status(400).json({ message: 'adminId is required.' });
    }

    if (!Array.isArray(gestures) || gestures.length === 0) {
      console.log('[submitForApproval] Invalid gestures:', gestures);
      return res.status(400).json({ message: 'gestures array is required and cannot be empty.' });
    }

    // Tạo hoặc update record
    const customGesture = await AdminCustomGesture.findOneAndUpdate(
      { adminId },
      {
        gestures,
        status: 'pending',
        rejectReason: '',
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    ).populate('adminId', 'fullName email role');

    // BLOCK ALL GESTURES when submitting for approval
    console.log('[submitForApproval] Blocking all gestures for admin:', adminId);
    try {
      const gestureRequest = await AdminGestureRequest.findOne({ adminId });
      if (gestureRequest) {
        let blockedCount = 0;
        gestureRequest.gestures.forEach(gesture => {
          if (gesture.status !== 'blocked') {
            gesture.status = 'blocked';
            gesture.blockedAt = new Date();
            blockedCount++;
          }
        });
        await gestureRequest.save();
        console.log(`[submitForApproval] Successfully blocked ${blockedCount} gestures`);
      } else {
        console.log('[submitForApproval] No AdminGestureRequest found for admin:', adminId);
      }
    } catch (blockError) {
      console.error('[submitForApproval] Failed to block gestures:', blockError);
      // Don't fail the submission if blocking fails
    }

    // Update gesture_request_status của admin thành 'disabled'
    await Admin.findByIdAndUpdate(adminId, { gesture_request_status: 'disabled' });

    return res.status(200).json({
      message: 'Đã gửi yêu cầu phê duyệt thành công.',
      data: customGesture,
      gesture_request_status: 'disabled',
    });
  } catch (error) {
    console.error('[submitForApproval] Error', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get admin status - cho admin xem status của mình
exports.getAdminStatus = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const requests = await AdminCustomGesture.find({ adminId })
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('[getAdminStatus] Error', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all pending requests cho superadmin
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await AdminCustomGesture.find({ status: 'pending' })
      .populate('adminId', 'fullName email role')
      .sort({ createdAt: -1 })
      .lean();

    console.log('[getPendingRequests] Found requests:', requests.length);

    return res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('[getPendingRequests] Error', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all requests (tất cả status) cho superadmin
exports.getAllRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};

    const requests = await AdminCustomGesture.find(filter)
      .populate('adminId', 'fullName email role')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error('[getAllRequests] Error', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve request
exports.approveRequest = async (req, res) => {
  console.log('[approveRequest] START - Called with id:', req.params.id, 'body:', req.body, 'user:', req.admin?.id);
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      console.log('[approveRequest] Missing adminId in request body');
      return res.status(400).json({ message: 'adminId is required.' });
    }

    const request = await AdminCustomGesture.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot approve request with status ${request.status}` });
    }

    // Update status to accept
    request.status = 'accept';
    await request.save();

    try {
      // Import required modules
      const path = require('path');
      const fs = require('fs/promises');
      const { runPythonScript } = require('../utils/pythonRunner');

      // Use PIPELINE_ROOT from env or resolve relative path
      const PIPELINE_ROOT = process.env.PIPELINE_ROOT || path.resolve(__dirname, '../../../..', 'hybrid_realtime_pipeline');
      console.log('[approveRequest] process.env.PIPELINE_ROOT:', process.env.PIPELINE_ROOT);
      console.log('[approveRequest] PIPELINE_ROOT:', PIPELINE_ROOT);
      const PIPELINE_CODE_DIR = path.join(PIPELINE_ROOT, 'code');
      console.log('[approveRequest] PIPELINE_CODE_DIR:', PIPELINE_CODE_DIR);

      const buildArtifactPaths = (adminId) => {
        const userDir = path.join(PIPELINE_CODE_DIR, `user_${adminId}`);
        return {
          modelsDir: path.join(userDir, 'models'),
          trainingResultsDir: path.join(userDir, 'training_results'),
          rawDataDir: path.join(userDir, 'raw_data')
        };
      };

      const purgeRawData = async (adminId) => {
        const rawDataDir = path.join(PIPELINE_CODE_DIR, `user_${adminId}`, 'raw_data');
        try {
          await fs.rm(rawDataDir, { recursive: true, force: true });
          console.log(`[purgeRawData] Cleaned up raw data directory: ${rawDataDir}`);
        } catch (error) {
          console.warn(`[purgeRawData] Failed to clean up ${rawDataDir}:`, error.message);
        }
      };

      // Run Python pipeline
      const userFolder = `user_${adminId}`;
      await runPythonScript('upload_user_folder.py', ['--user-id', adminId], PIPELINE_CODE_DIR);

      const artifactPaths = buildArtifactPaths(adminId);

      // Update request with success
      request.status = 'accept';
      request.artifactPaths = artifactPaths;
      request.rejectReason = '';
      await request.save();

      // Clean up raw data
      await purgeRawData(adminId);

      return res.json({
        success: true,
        message: 'Request approved and data prepared.',
        data: request,
        artifacts: artifactPaths,
      });
    } catch (pipelineError) {
      console.error('[approveRequest] Pipeline failed', pipelineError);
      
      // Update request with failure
      request.status = 'reject';
      request.rejectReason = pipelineError.message;
      await request.save();

      // Reset all gestures to active even if pipeline failed
      try {
        console.log('[approveRequest] Resetting all gestures to active after failed pipeline for admin:', adminId);
        const modifiedCount = await adminGestureRequestController.resetGesturesToActive(adminId);
        console.log(`[approveRequest] Successfully reset ${modifiedCount} gestures to active after pipeline failure`);
      } catch (resetError) {
        console.error('[approveRequest] Failed to reset gestures to active after pipeline failure:', resetError);
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to process customization request.',
        error: pipelineError.message,
        python_stdout: pipelineError.stdout,
        python_stderr: pipelineError.stderr,
      });
    }

    // Reset all gestures to active after successful approval
    try {
      console.log('[approveRequest] Resetting all gestures to active after successful approval for admin:', adminId, 'type:', typeof adminId);
      const modifiedCount = await adminGestureRequestController.resetGesturesToActive(adminId);
      console.log(`[approveRequest] Successfully reset ${modifiedCount} gestures to active after successful approval`);
    } catch (resetError) {
      console.error('[approveRequest] Failed to reset gestures to active after successful approval:', resetError);
      // Don't fail the approval if reset fails, but log it
    }

    console.log('[approveRequest] APPROVAL COMPLETED SUCCESSFULLY - Request ID:', id, 'Admin ID:', adminId);
    return res.json({
      success: true,
      message: 'Request approved and data prepared.',
      data: request,
      artifacts: artifactPaths,
    });
  } catch (error) {
    console.error('[approveRequest] Error', error);
    
    // Even if there's an error, try to reset gestures if we have adminId
    if (adminId) {
      try {
        console.log('[approveRequest] Emergency reset after error for admin:', adminId);
        await adminGestureRequestController.resetGesturesToActive(adminId);
      } catch (emergencyResetError) {
        console.error('[approveRequest] Emergency reset also failed:', emergencyResetError);
      }
    }
    
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject request
exports.rejectRequest = async (req, res) => {
  console.log('[rejectRequest] START - Called with id:', req.params.id, 'user:', req.admin?.id);
  try {
    const { id } = req.params;
    const { rejectReason = 'Rejected by superadmin' } = req.body;

    const request = await AdminCustomGesture.findById(id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ message: `Cannot reject request with status ${request.status}` });
    }

    // Update status thành 'reject' và lý do
    request.status = 'reject';
    request.rejectReason = rejectReason;
    await request.save();

    // Reset all gestures to active after rejection
    console.log('[rejectRequest] Request adminId:', request.adminId, 'type:', typeof request.adminId);
    try {
      const modifiedCount = await adminGestureRequestController.resetGesturesToActive(request.adminId);
      console.log(`[rejectRequest] Successfully reset ${modifiedCount} gestures to active`);
    } catch (resetError) {
      console.error('[rejectRequest] Failed to reset gestures to active:', resetError);
      // Don't fail the rejection if reset fails, but this is critical - log it prominently
      console.error('[rejectRequest] CRITICAL: Gestures may remain blocked after rejection!');
    }

    console.log('[rejectRequest] REJECTION COMPLETED SUCCESSFULLY - Request ID:', id, 'Admin ID:', request.adminId);
    return res.json({
      success: true,
      message: 'Request rejected successfully.',
      data: request,
    });
  } catch (error) {
    console.error('[rejectRequest] Error', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Test route
exports.testReject = async (req, res) => {
  console.log('[testReject] Called!');
  return res.json({ success: true, message: 'Test reject called' });
};