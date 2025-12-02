const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const PYTHON_BIN = process.env.PYTHON_BIN || 'python';
const PIPELINE_ROOT =
  process.env.PIPELINE_ROOT ||
  path.resolve(__dirname, '../../../hybrid_realtime_pipeline');
const PRACTICE_SESSION_SCRIPT = path.join(PIPELINE_ROOT, 'practice_session.py');

let activeSession = null;
let sessionLogs = [];

// Start a gesture practice session
exports.startPracticeSession = async (req, res) => {
  if (activeSession) {
    return res.status(409).json({
      success: false,
      message: 'A practice session is already running. Please stop it first.'
    });
  }

  const { gesture, cameraIndex = 0 } = req.body;
  
  if (!gesture) {
    return res.status(400).json({
      success: false,
      message: 'Gesture parameter is required.'
    });
  }

  try {
    sessionLogs = [];
    
    // Start practice session process
    const child = spawn(PYTHON_BIN, [
      PRACTICE_SESSION_SCRIPT,
      '--camera-index', cameraIndex.toString(),
      '--gesture', gesture
    ], {
      cwd: PIPELINE_ROOT,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PRACTICE_GESTURE: gesture, // Pass target gesture as env var
      },
    });

    activeSession = {
      process: child,
      gesture,
      cameraIndex,
      startTime: new Date(),
      logs: []
    };

    // Handle process output
    child.stdout.on('data', (data) => {
      const message = data.toString();
      sessionLogs.push({
        level: 'info',
        message: message.trim(),
        timestamp: new Date()
      });
      
      // Keep only last 100 log entries
      if (sessionLogs.length > 100) {
        sessionLogs = sessionLogs.slice(-100);
      }
    });

    child.stderr.on('data', (data) => {
      const message = data.toString();
      sessionLogs.push({
        level: 'error',
        message: message.trim(),
        timestamp: new Date()
      });
    });

    child.on('error', (error) => {
      console.error('Training session error:', error);
      activeSession = null;
    });

    child.on('close', (code) => {
      console.log(`Training session exited with code ${code}`);
      activeSession = null;
    });

    res.json({
      success: true,
      message: `Practice session started for gesture: ${gesture}`,
      session: {
        gesture,
        cameraIndex,
        startTime: activeSession.startTime
      }
    });

  } catch (error) {
    console.error('Failed to start practice session:', error);
    activeSession = null;
    
    res.status(500).json({
      success: false,
      message: 'Failed to start practice session',
      error: error.message
    });
  }
};

// Stop current practice session
exports.stopPracticeSession = async (req, res) => {
  if (!activeSession) {
    return res.status(404).json({
      success: false,
      message: 'No practice session is currently running.'
    });
  }

  try {
    // Gracefully terminate the process
    activeSession.process.kill('SIGTERM');
    
    const sessionInfo = {
      gesture: activeSession.gesture,
      duration: Date.now() - activeSession.startTime.getTime(),
      endTime: new Date()
    };
    
    activeSession = null;
    
    res.json({
      success: true,
      message: 'Practice session stopped successfully.',
      session: sessionInfo
    });
    
  } catch (error) {
    console.error('Failed to stop practice session:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to stop practice session',
      error: error.message
    });
  }
};

// Get current session status
exports.getSessionStatus = async (req, res) => {
  if (!activeSession) {
    return res.json({
      active: false,
      message: 'No practice session is currently running.'
    });
  }

  res.json({
    active: true,
    session: {
      gesture: activeSession.gesture,
      cameraIndex: activeSession.cameraIndex,
      startTime: activeSession.startTime,
      duration: Date.now() - activeSession.startTime.getTime()
    },
    logs: sessionLogs.slice(-20) // Return last 20 log entries
  });
};

// Get session logs (for real-time updates)
exports.getSessionLogs = async (req, res) => {
  const { since } = req.query;
  let logs = sessionLogs;
  
  if (since) {
    const sinceTime = new Date(since);
    logs = sessionLogs.filter(log => log.timestamp > sinceTime);
  }
  
  res.json({
    success: true,
    logs: logs.slice(-50), // Return max 50 recent logs
    hasActiveSession: !!activeSession
  });
};

module.exports = exports;