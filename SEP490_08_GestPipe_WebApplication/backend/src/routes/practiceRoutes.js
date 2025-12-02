const express = require('express');
const router = express.Router();
const practicePythonService = require('../services/practicePythonService');
const { protect: authMiddleware } = require('../middlewares/authMiddleware');

// Start practice session
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const { gestureId } = req.body;
    const userId = req.user?.id || 'test-user-123'; // Fallback for development
    
    if (!gestureId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gesture ID is required' 
      });
    }
    
    const result = await practicePythonService.startPracticeSession(gestureId, userId);
    res.json(result);
  } catch (error) {
    console.error('Start practice session error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to start practice session' 
    });
  }
});

// Stop practice session
router.post('/stop', authMiddleware, async (req, res) => {
  try {
    const { gestureId } = req.body;
    const userId = req.user?.id || 'test-user-123';
    
    const success = practicePythonService.stopPracticeSession(userId, gestureId);
    
    res.json({ 
      success, 
      message: success ? 'Practice session stopped' : 'No active session found' 
    });
  } catch (error) {
    console.error('Stop practice session error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to stop practice session' 
    });
  }
});

// Send frame to practice session
router.post('/frame', authMiddleware, async (req, res) => {
  try {
    const { gestureId, frameData } = req.body;
    const userId = req.user?.id || 'test-user-123';
    
    if (!gestureId || !frameData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Gesture ID and frame data are required' 
      });
    }
    
    const success = practicePythonService.sendFrameToSession(userId, gestureId, frameData);
    
    res.json({ 
      success, 
      message: success ? 'Frame sent' : 'No active session found' 
    });
  } catch (error) {
    console.error('Send frame error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send frame' 
    });
  }
});

// Get session status
router.get('/status/:gestureId', authMiddleware, (req, res) => {
  try {
    const { gestureId } = req.params;
    const userId = req.user?.id || 'test-user-123';
    
    const status = practicePythonService.getSessionStatus(userId, gestureId);
    res.json(status);
  } catch (error) {
    console.error('Get session status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get session status' 
    });
  }
});

// Reset session stats
router.post('/reset', authMiddleware, (req, res) => {
  try {
    const { gestureId } = req.body;
    const userId = req.user?.id || 'test-user-123';
    
    const success = practicePythonService.resetSession(userId, gestureId);
    
    res.json({ 
      success, 
      message: success ? 'Session reset' : 'No active session found' 
    });
  } catch (error) {
    console.error('Reset session error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to reset session' 
    });
  }
});

// Get all active sessions for user
router.get('/active', authMiddleware, (req, res) => {
  try {
    const userId = req.user?.id || 'test-user-123';
    const sessions = practicePythonService.getAllActiveSessions(userId);
    res.json({ sessions });
  } catch (error) {
    console.error('Get active sessions error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get active sessions' 
    });
  }
});

module.exports = router;