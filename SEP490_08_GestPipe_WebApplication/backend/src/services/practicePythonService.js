const { spawn } = require('child_process');
const path = require('path');

class PracticePythonService {
  constructor() {
    this.activeSessions = new Map(); // userId_gestureId -> session
  }

  startPracticeSession(gestureId, userId) {
    return new Promise((resolve, reject) => {
      const sessionKey = `${userId}_${gestureId}`;
      
      // Check if session already exists
      if (this.activeSessions.has(sessionKey)) {
        return reject(new Error('Practice session already active for this gesture'));
      }

      const pythonScriptPath = path.join(__dirname, '../../hybrid_realtime_pipeline/web_gesture_processor.py');
      
      // Spawn Python process with gesture parameter (using 'py' launcher on Windows)
      const pythonProcess = spawn('py', [pythonScriptPath, gestureId], {
        cwd: path.join(__dirname, '../../hybrid_realtime_pipeline'),
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      // Store process reference
      this.activeSessions.set(sessionKey, {
        process: pythonProcess,
        gestureId,
        userId,
        startTime: new Date(),
        status: 'starting',
        stats: { correct: 0, wrong: 0, total: 0 }
      });

      let isResolved = false;

      // Handle Python output
      pythonProcess.stdout.on('data', (data) => {
        const output = data.toString().trim();
        // console.log(`Python output [${gestureId}]:`, output);
        
        try {
          // Parse JSON messages from Python
          const lines = output.split('\n');
          lines.forEach(line => {
            if (line.startsWith('{') && line.endsWith('}')) {
              const message = JSON.parse(line);
              this.handlePythonMessage(sessionKey, message);
            }
          });

          // If this is the first successful output, resolve the promise
          if (!isResolved) {
            isResolved = true;
            resolve({
              success: true,
              sessionId: sessionKey,
              message: `Practice session started for ${gestureId}`
            });
          }
        } catch (error) {
          console.error('Error parsing Python output:', error);
        }
      });

      pythonProcess.stderr.on('data', (data) => {
        console.error(`Python stderr [${gestureId}]:`, data.toString());
      });

      pythonProcess.on('close', (code) => {
        // console.log(`Python process [${gestureId}] exited with code ${code}`);
        this.activeSessions.delete(sessionKey);
      });

      pythonProcess.on('error', (error) => {
        console.error(`Python process error [${gestureId}]:`, error);
        if (!isResolved) {
          isResolved = true;
          reject(error);
        }
        this.activeSessions.delete(sessionKey);
      });

      // Timeout after 10 seconds if Python doesn't respond
      setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error('Python process timeout'));
          this.stopPracticeSession(userId, gestureId);
        }
      }, 10000);
    });
  }

  handlePythonMessage(sessionKey, message) {
    const session = this.activeSessions.get(sessionKey);
    if (!session) return;

    switch (message.type) {
      case 'status_update':
        session.status = message.status;
        break;
      case 'gesture_result':
        if (message.correct) {
          session.stats.correct++;
        } else {
          session.stats.wrong++;
        }
        session.stats.total++;
        session.lastResult = message;
        break;
      case 'session_ready':
        session.status = 'ready';
        break;
      case 'error':
        session.status = 'error';
        session.error = message.error;
        break;
    }

    // Broadcast update to connected clients (implement with socket.io)
    this.broadcastUpdate(sessionKey, {
      type: 'practice_update',
      session: {
        gestureId: session.gestureId,
        status: session.status,
        stats: session.stats,
        lastResult: session.lastResult,
        error: session.error
      }
    });
  }

  stopPracticeSession(userId, gestureId) {
    const sessionKey = `${userId}_${gestureId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (session && session.process) {
      session.process.kill('SIGTERM');
      this.activeSessions.delete(sessionKey);
      return true;
    }
    return false;
  }

  getSessionStatus(userId, gestureId) {
    const sessionKey = `${userId}_${gestureId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (!session) {
      return { active: false };
    }

    return {
      active: true,
      gestureId: session.gestureId,
      status: session.status,
      stats: session.stats,
      startTime: session.startTime,
      lastResult: session.lastResult
    };
  }

  getAllActiveSessions(userId) {
    const userSessions = [];
    for (const [key, session] of this.activeSessions) {
      if (key.startsWith(`${userId}_`)) {
        userSessions.push({
          gestureId: session.gestureId,
          status: session.status,
          stats: session.stats,
          startTime: session.startTime
        });
      }
    }
    return userSessions;
  }

  sendFrameToSession(userId, gestureId, frameData) {
    const sessionKey = `${userId}_${gestureId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (!session || !session.process) {
      return false;
    }
    
    try {
      const command = {
        type: 'frame',
        data: frameData
      };
      
      session.process.stdin.write(JSON.stringify(command) + '\n');
      return true;
    } catch (error) {
      console.error(`Error sending frame to session ${sessionKey}:`, error);
      return false;
    }
  }

  resetSession(userId, gestureId) {
    const sessionKey = `${userId}_${gestureId}`;
    const session = this.activeSessions.get(sessionKey);
    
    if (!session || !session.process) {
      return false;
    }
    
    try {
      const command = { type: 'reset' };
      session.process.stdin.write(JSON.stringify(command) + '\n');
      
      // Reset local stats
      session.stats = { correct: 0, wrong: 0, total: 0 };
      return true;
    } catch (error) {
      console.error(`Error resetting session ${sessionKey}:`, error);
      return false;
    }
  }

  broadcastUpdate(sessionKey, update) {
    // This will be implemented with socket.io
    // For now, just store the update for polling
    const session = this.activeSessions.get(sessionKey);
    if (session) {
      session.lastUpdate = update;
      session.lastUpdateTime = new Date();
    }
  }
}

module.exports = new PracticePythonService();