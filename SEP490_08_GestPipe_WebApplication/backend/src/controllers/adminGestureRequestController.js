const AdminGestureRequest = require('../models/AdminGestureRequest');
const Admin = require('../models/Admin');
const GestureSample = require('../models/GestureSample');
const path = require('path');
const fs = require('fs/promises');
const { spawn } = require('child_process');

// Get all gesture requests for current admin
exports.getAdminGestureRequests = async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;

    let request = await AdminGestureRequest.findOne({ adminId });

    // If not exists, create new one with default gestures
    if (!request) {
      request = await AdminGestureRequest.createForAdmin(adminId);
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error getting admin gesture requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gesture requests',
      error: error.message
    });
  }
};

// Get gesture status for blocking logic
exports.getGestureStatuses = async (req, res) => {
  try {
    // Allow superadmin to get gestures of any admin by passing adminId query param
    let adminId = req.admin.id || req.admin._id;
    if (req.admin.role === 'superadmin' && req.query.adminId) {
      adminId = req.query.adminId;
    }
    console.log('[getGestureStatuses] adminId from JWT:', req.admin.id || req.admin._id);
    console.log('[getGestureStatuses] target adminId:', adminId);

    let request = await AdminGestureRequest.findOne({ adminId });

    // If not exists, create new one with default gestures
    if (!request) {
      request = await AdminGestureRequest.createForAdmin(adminId);
    }

    // Check if any gesture is blocked (waiting for approval)
    const hasBlockedGestures = request.gestures.some(g => g.status === 'blocked');
    const hasCustomedGestures = request.gestures.some(g => g.status === 'customed');

    res.json({
      success: true,
      data: {
        requests: request.gestures,
        hasBlockedGestures,
        hasCustomedGestures,
        canCustom: !hasBlockedGestures
      }
    });
  } catch (error) {
    console.error('Error getting gesture statuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gesture statuses',
      error: error.message
    });
  }
};

// Create or update gesture request when starting customization
exports.createOrUpdateRequest = async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;
    const { gestureId, gestureName } = req.body;

    if (!gestureId || !gestureName) {
      return res.status(400).json({
        success: false,
        message: 'gestureId and gestureName are required'
      });
    }

    // Find or create the admin's gesture request document
    let request = await AdminGestureRequest.findOne({ adminId });
    if (!request) {
      request = await AdminGestureRequest.createForAdmin(adminId);
    }

    // Check if gesture is already blocked or customed
    const gesture = request.gestures.find(g => g.gestureId === gestureId);
    if (gesture && (gesture.status === 'customed' || gesture.status === 'blocked')) {
      return res.status(409).json({
        success: false,
        message: 'Gesture is already being customized or waiting for approval'
      });
    }

    // Update the gesture status in the array
    const gestureIndex = request.gestures.findIndex(g => g.gestureId === gestureId);
    if (gestureIndex !== -1) {
      request.gestures[gestureIndex].status = 'customed';
      request.gestures[gestureIndex].gestureName = gestureName;
      request.gestures[gestureIndex].customedAt = new Date();
    } else {
      // If gesture not in array, add it (though it should be there)
      request.gestures.push({
        gestureId,
        gestureName,
        status: 'customed',
        customedAt: new Date()
      });
    }

    await request.save();

    res.json({
      success: true,
      message: 'Gesture request created/updated',
      data: request
    });
  } catch (error) {
    console.error('Error creating/updating gesture request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update gesture request',
      error: error.message
    });
  }
};

// Submit request for approval (block all customed gestures)
exports.submitForApproval = async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;

    // Find the admin's gesture request document
    const request = await AdminGestureRequest.findOne({ adminId });
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'No gesture requests found'
      });
    }

    // Update all gestures to blocked (not just customed ones)
    let modifiedCount = 0;
    console.log('[submitForApproval] Before update - gesture statuses:', request.gestures.map(g => ({ id: g.gestureId, status: g.status })));
    request.gestures.forEach(gesture => {
      // Update ALL gestures to blocked, regardless of current status
      gesture.status = 'blocked';
      gesture.blockedAt = new Date();
      modifiedCount++;
    });
    console.log('[submitForApproval] After update - all gestures set to blocked, modifiedCount:', modifiedCount);

    await request.save();

    res.json({
      success: true,
      message: `All ${modifiedCount} gestures submitted for approval`,
      data: { modifiedCount }
    });
  } catch (error) {
    console.error('Error submitting for approval:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit for approval',
      error: error.message
    });
  }
};

// Delete all customed gestures and reset to ready (admin action)
exports.deleteAllCustomed = async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;

    // Find the admin's gesture request document
    const request = await AdminGestureRequest.findOne({ adminId });
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'No gesture requests found'
      });
    }

    // Delete user folder
    const fs = require('fs').promises;
    const path = require('path');
    const PIPELINE_CODE_DIR = path.resolve(__dirname, '../../../..', 'hybrid_realtime_pipeline', 'code');
    const userDir = path.join(PIPELINE_CODE_DIR, `user_${adminId}`);

    try {
      await fs.rm(userDir, { recursive: true, force: true });
      console.log(`Deleted user directory: ${userDir}`);
    } catch (fileErr) {
      console.warn(`Failed to delete user directory:`, fileErr.message);
    }

    // Reset all customed gestures to ready
    let modifiedCount = 0;
    request.gestures.forEach(gesture => {
      if (gesture.status === 'customed') {
        gesture.status = 'ready';
        gesture.customedAt = undefined;
        gesture.blockedAt = undefined;
        gesture.approvedAt = undefined;
        modifiedCount++;
      }
    });

    await request.save();

    res.json({
      success: true,
      message: `Reset ${modifiedCount} gestures to ready and deleted user folder`,
      data: { modifiedCount }
    });
  } catch (error) {
    console.error('Error deleting customed gestures:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete customed gestures',
      error: error.message
    });
  }
};

// Approve gesture requests (superadmin only)
exports.approveRequests = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can approve requests'
      });
    }

    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'adminId is required'
      });
    }

    // Find the admin's gesture request document
    const request = await AdminGestureRequest.findOne({ adminId });
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'No gesture requests found for this admin'
      });
    }

    // Update all blocked gestures to ready
    let modifiedCount = 0;
    request.gestures.forEach(gesture => {
      if (gesture.status === 'blocked') {
        gesture.status = 'ready';
        gesture.approvedAt = new Date();
        modifiedCount++;
      }
    });

    await request.save();

    res.json({
      success: true,
      message: `Approved ${modifiedCount} gestures for admin`,
      data: { modifiedCount }
    });
  } catch (error) {
    console.error('Error approving requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve requests',
      error: error.message
    });
  }
};

// Reject gesture requests (superadmin only)
exports.rejectRequests = async (req, res) => {
  try {
    // Check if user is superadmin
    if (req.admin.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Only superadmin can reject requests'
      });
    }

    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: 'adminId is required'
      });
    }

    // Update all blocked gestures to ready (allow recustomization)
    const result = await AdminGestureRequest.updateMany(
      { adminId, status: 'blocked' },
      { status: 'ready', updatedAt: new Date() }
    );

    res.json({
      success: true,
      message: `Rejected ${result.modifiedCount} gestures for admin`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    console.error('Error rejecting requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject requests',
      error: error.message
    });
  }
};

// Reset all gestures to active (ready) status for testing
exports.resetAllToActive = async (req, res) => {
  try {
    // Allow superadmin to reset gestures for other admins
    let targetAdminId = req.body.adminId || (req.admin.id || req.admin._id);
    
    await resetGesturesToActive(targetAdminId);

    res.json({
      success: true,
      message: `Reset gestures to active (ready) status`,
      data: { modifiedCount: 0 } // Will be updated in helper
    });
  } catch (error) {
    console.error('Error resetting gestures to active:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset gestures to active',
      error: error.message
    });
  }
};

// Helper function to reset gestures without req/res
const resetGesturesToActive = async (targetAdminId) => {
  console.log('[resetGesturesToActive] Called with adminId:', targetAdminId, 'type:', typeof targetAdminId);
  
  // Ensure targetAdminId is a valid ObjectId
  if (typeof targetAdminId === 'string') {
    try {
      targetAdminId = require('mongoose').Types.ObjectId(targetAdminId);
      console.log('[resetGesturesToActive] Converted string to ObjectId:', targetAdminId);
    } catch (convertError) {
      console.error('[resetGesturesToActive] Invalid ObjectId string:', targetAdminId, convertError);
      throw new Error('Invalid adminId format');
    }
  } else if (!targetAdminId || !require('mongoose').Types.ObjectId.isValid(targetAdminId)) {
    console.error('[resetGesturesToActive] Invalid adminId:', targetAdminId);
    throw new Error('Invalid adminId');
  }

  console.log('[resetGesturesToActive] Looking for AdminGestureRequest with adminId:', targetAdminId);

  // Find the target admin's gesture request document
  let request = await AdminGestureRequest.findOne({ adminId: targetAdminId });

  console.log('[resetGesturesToActive] Found request:', request ? 'YES' : 'NO');
  if (request) {
    console.log('[resetGesturesToActive] Request _id:', request._id);
    console.log('[resetGesturesToActive] Request adminId:', request.adminId);
    console.log('[resetGesturesToActive] Request gestures count:', request.gestures.length);
    console.log('[resetGesturesToActive] Gesture statuses before reset:', request.gestures.map(g => `${g.gestureId}: ${g.status}`));
  }

  // If not exists, create new one with default gestures
  if (!request) {
    console.log('[resetGesturesToActive] Creating new request for admin');
    try {
      request = await AdminGestureRequest.createForAdmin(targetAdminId);
      console.log('[resetGesturesToActive] Successfully created new request');
    } catch (createError) {
      console.error('[resetGesturesToActive] Failed to create new request:', createError);
      throw createError;
    }
  }

  // Reset all gestures to ready (active)
  let modifiedCount = 0;
  console.log('[resetGesturesToActive] About to reset gestures. Current statuses:');
  request.gestures.forEach((gesture, index) => {
    console.log(`  [${index}] ${gesture.gestureId}: ${gesture.status}`);
    if (gesture.status !== 'ready') {
      console.log(`    -> Resetting ${gesture.gestureId} from ${gesture.status} to ready`);
      gesture.status = 'ready';
      gesture.customedAt = undefined;
      gesture.blockedAt = undefined;
      gesture.approvedAt = undefined;
      modifiedCount++;
    } else {
      console.log(`    -> ${gesture.gestureId} already ready, skipping`);
    }
  });

  console.log('[resetGesturesToActive] Modified count:', modifiedCount);
  try {
    await request.save();
    console.log('[resetGesturesToActive] Successfully saved to database');
  } catch (saveError) {
    console.error('[resetGesturesToActive] Failed to save to database:', saveError);
    throw saveError;
  }
  return modifiedCount;
};

// Export helper function for internal use
exports.resetGesturesToActive = resetGesturesToActive;

// Send custom gestures to Google Drive
exports.sendToDrive = async (req, res) => {
  try {
    const adminId = req.admin.id || req.admin._id;

    // Find the admin's gesture request document
    const request = await AdminGestureRequest.findOne({ adminId });
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'No gesture requests found'
      });
    }

    // Check if there are any customed gestures
    const customedGestures = request.gestures.filter(g => g.status === 'customed');
    if (customedGestures.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No custom gestures to send'
      });
    }

    console.log(`[sendToDrive] Sending ${customedGestures.length} custom gestures to Drive for admin ${adminId}`);

    // Get absolute path to Python script
    const scriptPath = path.resolve(__dirname, '../../services/upload_custom_gestures.py');
    const projectRoot = path.resolve(__dirname, '../../../../');

    console.log(`[sendToDrive] Script path: ${scriptPath}`);
    console.log(`[sendToDrive] Project root: ${projectRoot}`);

    // Call Python script to upload to Drive
    const pythonProcess = spawn('python', [
      scriptPath,
      adminId
    ], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: projectRoot }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', async (code) => {
      console.log(`[sendToDrive] Python process exited with code: ${code}`);
      console.log(`[sendToDrive] stdout: ${stdout}`);
      console.log(`[sendToDrive] stderr: ${stderr}`);

      if (code === 0) {
        console.log('[sendToDrive] Successfully uploaded to Drive');

        // Delete local files after successful upload
        try {
          const userFolder = path.join(__dirname, '../../../../hybrid_realtime_pipeline/code', `user_${adminId}`);
          await fs.rm(userFolder, { recursive: true, force: true });
          console.log(`[sendToDrive] Deleted local folder: ${userFolder}`);
        } catch (deleteError) {
          console.warn('[sendToDrive] Failed to delete local files:', deleteError);
        }

        // Set all gestures to blocked and add blocked timestamp
        request.gestures.forEach(gesture => {
          gesture.status = 'blocked';
          gesture.blockedAt = new Date();
        });

        await request.save();

        res.json({
          success: true,
          message: 'Successfully sent to Drive, please wait 15 minutes before continuing to customize',
          data: {
            uploadedCount: customedGestures.length,
            blockedUntil: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes from now
          }
        });
      } else {
        console.error('[sendToDrive] Python script failed:', stderr);
        res.status(500).json({
          success: false,
          message: 'Failed to upload to Drive',
          error: stderr
        });
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('[sendToDrive] Failed to start Python process:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start upload process',
        error: error.message
      });
    });

  } catch (error) {
    console.error('Error sending to Drive:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send to Drive',
      error: error.message
    });
  }
};