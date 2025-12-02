const Admin = require('../models/Admin');
const path = require('path');
const fs = require('fs/promises');
const mongoose = require('mongoose');

const AdminCustomGesture = require('../models/AdminCustomGesture');
const CustomGestureRequest = require('../models/CustomGestureRequest');
const AdminGestureRequest = require('../models/AdminGestureRequest');
const { runPythonScript } = require('../utils/pythonRunner');

const PIPELINE_CODE_DIR = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'hybrid_realtime_pipeline',
  'code'
);

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



exports.submitCustomizationRequest = async (req, res) => {
  try {
    const { adminId, gestures = [] } = req.body;
    if (!adminId) {
      return res.status(400).json({ message: 'adminId is required.' });
    }

    const userDir = path.join(PIPELINE_CODE_DIR, `user_${adminId}`);
    const masterCsvPath = path.join(userDir, `gesture_data_custom_${adminId}.csv`);

    try {
      await fs.access(masterCsvPath);
    } catch (err) {
      return res.status(400).json({ message: 'No recorded samples were found for this admin.' });
    }

    const gestureList = Array.isArray(gestures) && gestures.length ? gestures : undefined;

    const requestDoc = await CustomGestureRequest.create({
      adminId,
      gestures: gestureList || ['custom_session'],
      status: 'pending',
    });

    await AdminCustomGesture.findOneAndUpdate(
      { adminId },
      {
        status: 'submitted',
        rejectionReason: '',
        lastRequestId: requestDoc._id,
        ...(gestureList ? { gestures: gestureList } : {}),
      },
      { upsert: true }
    );

    // Block all gestures for this admin when submitting request
    await AdminGestureRequest.findOneAndUpdate(
      { adminId },
      {
        $set: {
          'gestures.$[].status': 'blocked',
          'gestures.$[].blockedAt': new Date()
        }
      },
      { upsert: true }
    );

    // Update gesture_request_status to 'disabled' for this admin
    await Admin.findByIdAndUpdate(adminId, { gesture_request_status: 'disabled' });

    return res.status(200).json({
      message: 'Đã gửi yêu cầu tuỳ chỉnh. Vui lòng chờ SuperAdmin duyệt.',
      requestId: requestDoc._id,
      gesture_request_status: 'disabled',
    });
  } catch (error) {
    console.error('[submitCustomizationRequest] Error', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.listRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await CustomGestureRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate('adminId', 'fullName email role')
      .lean();
    res.json(requests);
  } catch (error) {
    console.error('[listRequests] Error', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getAdminStatus = async (req, res) => {
  try {
    const adminId = req.admin.id;
    const entry = await AdminCustomGesture.findOne({ adminId })
      .populate('lastRequestId')
      .lean();
    res.json(entry || null);
  } catch (error) {
    console.error('[getAdminStatus] Error', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.approveRequest = async (req, res) => {
  console.log('[customGestureRequestController.approveRequest] START - Request ID:', req.params.id, 'User:', req.admin?.id);
  const { id } = req.params;
  const requestDoc = await CustomGestureRequest.findById(id);
  if (!requestDoc) {
    return res.status(404).json({ message: 'Request not found.' });
  }
  if (!['pending', 'failed'].includes(requestDoc.status)) {
    return res.status(400).json({ message: `Cannot approve request in status ${requestDoc.status}` });
  }

  requestDoc.status = 'processing';
  await requestDoc.save();

  try {
    // Step 0: Check if user data exists on Google Drive
    console.log('[approveRequest] Step 0: Checking user data on Google Drive...');
    await runPythonScript('check_drive_data.py', [requestDoc.adminId], BACKEND_SERVICES_DIR);

    // Step 1: Download user data from Google Drive
    console.log('[approveRequest] Step 1: Downloading user data...');
    await runPythonScript('download_user_data.py', ['--user-id', requestDoc.adminId], BACKEND_SERVICES_DIR);

    // Step 2: Prepare user data
    console.log('[approveRequest] Step 2: Preparing user data...');
    await runPythonScript('prepare_user_data.py', ['--user-id', requestDoc.adminId], PIPELINE_CODE_DIR);

    // Step 3: Train model in user folder
    console.log('[approveRequest] Step 3: Training model...');
    const userFolderPath = path.join(ROOT_DIR, 'hybrid_realtime_pipeline', 'code', `user_${requestDoc.adminId}`);
    const trainingScriptSrc = path.join(PIPELINE_CODE_DIR, 'train_motion_svm_all_models.py');
    const trainingScriptDest = path.join(userFolderPath, 'train_motion_svm_all_models.py');
    
    // Move training script into user folder
    await fs.copyFile(trainingScriptSrc, trainingScriptDest);
    
    try {
      await runPythonScript('train_motion_svm_all_models.py', ['--dataset', 'gesture_data_custom_full.csv'], userFolderPath);
      console.log('[approveRequest] Training completed successfully');
    } finally {
      // Move script back to original location
      try {
        await fs.copyFile(trainingScriptDest, trainingScriptSrc);
        await fs.unlink(trainingScriptDest);
      } catch (moveBackError) {
        console.error('[approveRequest] Failed to move script back:', moveBackError);
      }
    }

    // Step 4: Upload trained results to Google Drive and cleanup
    console.log('[approveRequest] Step 4: Uploading trained model and cleanup...');
    
    // Cleanup: remove raw_data folder and extra CSV files before upload
    const rawDataPath = path.join(userFolderPath, 'raw_data');
    const csv1Path = path.join(userFolderPath, `gesture_data_custom_${requestDoc.adminId}.csv`);
    const csv2Path = path.join(userFolderPath, 'gesture_data_custom_full.csv');
    
    for (const cleanupPath of [rawDataPath, csv1Path, csv2Path]) {
      try {
        const stats = await fs.stat(cleanupPath);
        if (stats.isDirectory()) {
          await fs.rm(cleanupPath, { recursive: true, force: true });
        } else {
          await fs.unlink(cleanupPath);
        }
        console.log(`[approveRequest] Cleaned up: ${path.basename(cleanupPath)}`);
      } catch (error) {
        console.warn(`[approveRequest] Failed to cleanup ${cleanupPath}:`, error.message);
      }
    }
    
    await runPythonScript('upload_trained_model.py', ['--user-id', requestDoc.adminId], BACKEND_SERVICES_DIR);

    // Set gesture_request_status to 'pending' (training completed successfully)
    await Admin.findByIdAndUpdate(requestDoc.adminId, { gesture_request_status: 'pending' });
    console.log('[approveRequest] Status updated to pending for user:', requestDoc.adminId);

    await CustomGestureRequest.findByIdAndUpdate(id, {
      status: 'approved',
      artifactPaths,
    });

    await AdminCustomGesture.findOneAndUpdate(
      { adminId: requestDoc.adminId },
      {
        status: 'approved',
        artifactPaths,
        rejectionReason: '',
        lastRequestId: requestDoc._id,
      }
    );

    await purgeRawData(requestDoc.adminId);

    // Re-enable gesture_request_status for this admin (they can request again in future)
    await Admin.findByIdAndUpdate(requestDoc.adminId, { gesture_request_status: 'enabled' });

    // Reset all gestures to active after successful approval
    console.log('[approveRequest] Resetting all gestures to active after successful approval for admin:', requestDoc.adminId);
    try {
      const adminGestureRequestController = require('./adminGestureRequestController');
      const modifiedCount = await adminGestureRequestController.resetGesturesToActive(requestDoc.adminId);
      console.log(`[approveRequest] Successfully reset ${modifiedCount} gestures to active`);
    } catch (resetError) {
      console.error('[approveRequest] Failed to reset gestures to active:', resetError);
      // Don't fail the approval if reset fails
    }

    return res.json({ message: 'Request approved and data prepared.', artifacts: artifactPaths });
  } catch (error) {
    console.error('[approveRequest] Pipeline failed', error);
    await CustomGestureRequest.findByIdAndUpdate(id, {
      status: 'failed',
      rejectionReason: error.message,
    });
    await AdminCustomGesture.findOneAndUpdate(
      { adminId: requestDoc.adminId },
      {
        status: 'failed',
        rejectionReason: error.message,
      }
    );
    return res.status(500).json({
      message: 'Failed to process customization request.',
      error: error.message,
      python_stdout: error.stdout,
      python_stderr: error.stderr,
    });
  }
};

exports.rejectRequest = async (req, res) => {
  const { id } = req.params;
  const { reason = 'Rejected by superadmin' } = req.body;
  const requestDoc = await CustomGestureRequest.findById(id);
  if (!requestDoc) {
    return res.status(404).json({ message: 'Request not found.' });
  }
  if (!['pending', 'failed'].includes(requestDoc.status)) {
    return res.status(400).json({ message: `Cannot reject request in status ${requestDoc.status}` });
  }

  await CustomGestureRequest.findByIdAndUpdate(id, {
    status: 'rejected',
    rejectionReason: reason,
  });
  await AdminCustomGesture.findOneAndUpdate(
    { adminId: requestDoc.adminId },
    {
      status: 'rejected',
      rejectionReason: reason,
      lastRequestId: requestDoc._id,
    }
  );

  // Unblock all gestures for this admin when request is rejected
  await AdminGestureRequest.findOneAndUpdate(
    { adminId: requestDoc.adminId },
    {
      $set: {
        'gestures.$[].status': 'ready'
      },
      $unset: {
        'gestures.$[].blockedAt': 1
      }
    }
  );

  // Re-enable gesture_request_status for this admin
  await Admin.findByIdAndUpdate(requestDoc.adminId, { gesture_request_status: 'enabled' });

  return res.json({ message: 'Request rejected.' });
};
