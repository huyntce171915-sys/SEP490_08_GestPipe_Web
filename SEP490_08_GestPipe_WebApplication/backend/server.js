require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { PythonShell } = require('python-shell');
const connectDB = require('./src/config/db');

// Connect to Database
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./src/routes/authRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const adminCustomGestureRoutes = require('./src/routes/adminCustomGestureRoutes');
const translationRoutes = require('./src/routes/translationRoutes');
const gestureRoutes = require('./src/routes/gestureRoutes');
const practiceRoutes = require('./src/routes/practiceRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const userRoutes = require('./src/routes/userRoutes');
const versionRoutes = require('./src/routes/versionRoutes');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin-custom-gestures', adminCustomGestureRoutes);
app.use('/api/translations', translationRoutes);
app.use('/api/gestures', gestureRoutes);
app.use('/api/practice', practiceRoutes);
app.use('/api/user', userRoutes);
app.use('/api/versions', versionRoutes);

// Simple route for testing
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Test route without auth
app.get('/api/test', (req, res) => {
  res.json({ message: 'Test route works!' });
});

// Test gesture prediction without auth
app.post('/api/test-predict', async (req, res) => {
  try {
    const { left_fingers, right_fingers, motion_features, target_gesture, duration } = req.body;

    if (!left_fingers || !right_fingers || !motion_features || !target_gesture) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log('🎯 Test Evaluating gesture:', target_gesture);

    // Call Python script
    const scriptPath = './src/utils/gesture_prediction.py';

    const results = await new Promise((resolve, reject) => {
      const pyshell = new PythonShell(scriptPath, {
        mode: 'json',
        pythonPath: 'python',
        pythonOptions: ['-u'],
        scriptPath: __dirname  // Set working directory to backend root
      });

      pyshell.send({
        left_fingers, right_fingers, motion_features, target_gesture, duration: duration || 1.0
      });

      pyshell.on('message', (message) => {
        resolve(message);
      });

      pyshell.on('error', (error) => {
        reject(error);
      });

      pyshell.end((err) => {
        if (err) reject(err);
      });
    });

    res.json(results);
  } catch (error) {
    console.error('Test predict error:', error);
    res.status(500).json({ message: 'Test prediction failed', error: error.message });
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle gesture practice session start
  socket.on('start-practice', (data) => {
    console.log('Starting practice session:', data);
    // Start Python process for gesture recognition
    const { spawn } = require('child_process');
    const pythonProcess = spawn('python', [
      'd:/DO_AN/python_mediapipe/hybrid_realtime_pipeline/web_gesture_processor.py',
      data.gestureName
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    socket.pythonProcess = pythonProcess;

    // Handle Python process output
    pythonProcess.stdout.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString().trim());
        socket.emit('gesture-result', message);
      } catch (e) {
        console.log('Python output:', data.toString());
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString());
    });

    pythonProcess.on('close', (code) => {
      console.log(`Python process exited with code ${code}`);
      socket.emit('practice-ended');
    });

    socket.emit('practice-started', { message: 'Practice session started' });
  });

  // Handle frame data from client
  socket.on('frame', (data) => {
    if (socket.pythonProcess && !socket.pythonProcess.killed) {
      // Send frame data to Python process
      const frameCommand = JSON.stringify({
        type: 'frame',
        data: data.frameData
      });
      socket.pythonProcess.stdin.write(frameCommand + '\n');
    }
  });

  // Handle practice stop
  socket.on('stop-practice', () => {
    if (socket.pythonProcess) {
      socket.pythonProcess.kill();
      socket.pythonProcess = null;
    }
    socket.emit('practice-stopped');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    if (socket.pythonProcess) {
      socket.pythonProcess.kill();
    }
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
