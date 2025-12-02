import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { X, PlayCircle, StopCircle, RotateCcw, Trophy, Target, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../utils/ThemeContext';
import { GESTURE_DATABASE } from '../utils/gestureDatabase';

// MediaPipe imports
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// Socket.IO import
import io from 'socket.io-client';

// Create gesture options from database
const GESTURE_OPTIONS = Object.keys(GESTURE_DATABASE).map(key => ({
  value: key,
  label: GESTURE_DATABASE[key].description,
  data: GESTURE_DATABASE[key]
}));

const GesturePracticeMLPage = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [selectedGesture, setSelectedGesture] = useState('');
  const [isPracticing, setIsPracticing] = useState(false);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0, accuracy: 0 });
  const [currentStatus, setCurrentStatus] = useState('Select a gesture to begin');
  const [frameCount, setFrameCount] = useState(0);
  const [lastSentFrame, setLastSentFrame] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize camera and MediaPipe
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 800, height: 500, facingMode: 'user' }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.style.transform = 'scaleX(-1)'; // Flip horizontally to fix mirroring
        }

        // Initialize MediaPipe Hands
        const hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          }
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 0,  // Reduced from 1 to 0 for faster processing
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results) => {
          if (canvasRef.current && results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw hand landmarks
            drawConnectors(ctx, results.multiHandLandmarks[0], Hands.HAND_CONNECTIONS, {
              color: '#00FF00',
              lineWidth: 2
            });
            drawLandmarks(ctx, results.multiHandLandmarks[0], {
              color: '#FF0000',
              lineWidth: 1,
              radius: 3
            });

            // Send frame to server if practicing
            if (isPracticing && socket && isConnected) {
              sendFrameToServer();
            }
          }
        });

        // Initialize camera with MediaPipe
        const camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 800,
          height: 500
        });

        camera.start();

      } catch (error) {
        console.error('Camera/MediaPipe initialization failed:', error);
        toast.error('Failed to initialize camera and hand tracking');
      }
    };

    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Initialize Socket.IO connection
  useEffect(() => {
    const socketConnection = io('http://localhost:5001');
    setSocket(socketConnection);

    socketConnection.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setCurrentStatus('Connected to server - Select a gesture to begin');
    });

    socketConnection.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
      setCurrentStatus('Disconnected from server');
      setIsPracticing(false);
    });

    socketConnection.on('practice-started', (data) => {
      console.log('Practice started:', data);
      setCurrentStatus('Practice session started - Close left fist to begin recording');
    });

    socketConnection.on('gesture-result', (result) => {
      console.log('Gesture result:', result);

      if (result.type === 'status_update') {
        setCurrentStatus(result.status);
      } else if (result.type === 'gesture_result') {
        setStats(result.stats);
        if (result.success) {
          setCurrentStatus(`✅ ${result.message}`);
          toast.success(result.message);
        } else {
          setCurrentStatus(`❌ ${result.message}`);
          toast.error(result.message);
        }
      }
    });

    socketConnection.on('practice-ended', () => {
      console.log('Practice ended');
      setIsPracticing(false);
      setCurrentStatus('Practice session ended');
    });

    socketConnection.on('practice-stopped', () => {
      console.log('Practice stopped');
      setIsPracticing(false);
      setCurrentStatus('Practice session stopped');
    });

    return () => {
      socketConnection.disconnect();
    };
  }, []);

  // Send frame to server
  const sendFrameToServer = useCallback(() => {
    if (!videoRef.current || !socket || !isConnected) return;

    setFrameCount(prev => {
      const newCount = prev + 1;
      // Only send every 3rd frame to reduce lag
      if (newCount - lastSentFrame >= 3) {
        setLastSentFrame(newCount);
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = 800;
          canvas.height = 500;

          // Draw the current video frame to canvas
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          // Convert to base64 with lower quality to reduce data size
          const frameData = canvas.toDataURL('image/jpeg', 0.6);

          // Send to server
          socket.emit('frame', { frameData });
        } catch (error) {
          console.error('Error sending frame:', error);
        }
      }
      return newCount;
    });
  }, [socket, isConnected, lastSentFrame]);

  // Start practice session
  const startPractice = () => {
    if (!selectedGesture) {
      toast.error('Please select a gesture first');
      return;
    }

    if (!socket || !isConnected) {
      toast.error('Not connected to server');
      return;
    }

    setIsPracticing(true);
    setCurrentStatus('Starting practice session...');
    setFrameCount(0);
    setLastSentFrame(0);

    socket.emit('start-practice', { gestureName: selectedGesture });
  };

  // Stop practice session
  const stopPractice = () => {
    if (socket && isConnected) {
      socket.emit('stop-practice');
    }
    setIsPracticing(false);
    setCurrentStatus('Practice stopped');
  };

  // Reset stats
  const resetStats = useCallback(() => {
    setStats({ correct: 0, wrong: 0, total: 0, accuracy: 0 });
    setCurrentStatus('Stats reset - Select a gesture to begin');
  }, []);

  // Handle gesture selection
  const handleGestureSelect = (gesture) => {
    setSelectedGesture(gesture);
    setCurrentStatus(`Selected: ${gesture.replace('_', ' ').toUpperCase()}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">ML Gesture Practice</h1>
            <p className="text-gray-400">Practice gestures with AI-powered recognition</p>
          </div>
          <button
            onClick={() => navigate('/gestures')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5 mr-2 inline" />
            Back to Gestures
          </button>
        </div>

        {/* Connection Status */}
        <div className="mb-6">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isConnected
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {isConnected ? 'Connected to ML Server' : 'Disconnected from ML Server'}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Camera View */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Camera Feed</h2>
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-[500px] bg-gray-900 rounded-lg"
                  autoPlay
                  muted
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-[500px] pointer-events-none"
                  width={800}
                  height={500}
                />
                {isPracticing && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                      RECORDING
                    </div>
                  </div>
                )}
              </div>

              {/* Status Display */}
              <div className="mt-4 p-4 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">Status:</span>
                  <span className="text-gray-300">{currentStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6">
            {/* Gesture Selection */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Select Gesture</h3>
              <select
                value={selectedGesture}
                onChange={(e) => handleGestureSelect(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={isPracticing}
              >
                <option value="">Choose a gesture...</option>
                {GESTURE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {selectedGesture && (
                <div className="mt-4 p-3 bg-gray-700 rounded-lg">
                  <h4 className="text-white font-medium mb-2">Instructions:</h4>
                  <p className="text-gray-300 text-sm">
                    {GESTURE_DATABASE[selectedGesture]?.instruction}
                  </p>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Practice Controls</h3>
              <div className="space-y-3">
                {!isPracticing ? (
                  <button
                    onClick={startPractice}
                    disabled={!selectedGesture || !isConnected}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <PlayCircle className="w-5 h-5 mr-2" />
                    Start Practice
                  </button>
                ) : (
                  <button
                    onClick={stopPractice}
                    className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <StopCircle className="w-5 h-5 mr-2" />
                    Stop Practice
                  </button>
                )}

                <button
                  onClick={resetStats}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Reset Stats
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
                Statistics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Correct:</span>
                  <span className="text-green-400 font-bold">{stats.correct}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Wrong:</span>
                  <span className="text-red-400 font-bold">{stats.wrong}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total:</span>
                  <span className="text-white font-bold">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Accuracy:</span>
                  <span className="text-blue-400 font-bold">{stats.accuracy}%</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-500" />
                How to Practice
              </h3>
              <div className="text-gray-300 text-sm space-y-2">
                <p>1. Select a gesture from the dropdown</p>
                <p>2. Click "Start Practice" to begin</p>
                <p>3. Close your LEFT fist to start recording</p>
                <p>4. Perform the gesture with your RIGHT hand</p>
                <p>5. Open your LEFT fist to get the result</p>
                <p>6. Repeat to improve your accuracy!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default GesturePracticeMLPage;