import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { X, PlayCircle, StopCircle, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// Gesture templates từ CSV data thực tế
const GESTURE_TEMPLATES = {
  "rotate_down": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 0, 0, 0],
    "main_axis_x": 0,
    "main_axis_y": 1,
    "delta_x": -0.002614,
    "delta_y": 0.185558,
    "is_static": false,
    "description": "Rotate down - Index and thumb extended, move down"
  },
  "rotate_left": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 0, 0, 0],
    "main_axis_x": 1,
    "main_axis_y": 0,
    "delta_x": -0.130413,
    "delta_y": -0.005325,
    "is_static": false,
    "description": "Rotate left - Index and thumb extended, move right (your right)"
  },
  "zoom_in": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 1, 0, 0],
    "main_axis_x": 0,
    "main_axis_y": 1,
    "delta_x": 0.0,
    "delta_y": -0.168766,
    "is_static": false,
    "description": "Zoom in - Thumb, index, middle extended, move up"
  },
  "zoom_out": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 1, 0, 0],
    "main_axis_x": 0,
    "main_axis_y": 1,
    "delta_x": 0.0,
    "delta_y": 0.168766,
    "is_static": false,
    "description": "Zoom out - Thumb, index, middle extended, move down"
  },
  "rotate_up": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 0, 0, 0],
    "main_axis_x": 0,
    "main_axis_y": 1,
    "delta_x": 0.028591,
    "delta_y": -0.185792,
    "is_static": false,
    "description": "Rotate up - Index and thumb extended, move up"
  },
  "rotate_right": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 0, 0, 0],
    "main_axis_x": 1,
    "main_axis_y": 0,
    "delta_x": 0.117388,
    "delta_y": 0.04424,
    "is_static": false,
    "description": "Rotate right - Index and thumb extended, move left (your left)"
  },
  "previous_slide": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [0, 1, 1, 0, 0],
    "main_axis_x": 1,
    "main_axis_y": 0,
    "delta_x": -0.15216,
    "delta_y": -0.016298,
    "is_static": false,
    "description": "Previous slide - Index and middle extended, move right (your right)"
  },
  "next_slide": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [0, 1, 1, 0, 0],
    "main_axis_x": 1,
    "main_axis_y": 0,
    "delta_x": 0.116381,
    "delta_y": 0.00673,
    "is_static": false,
    "description": "Next slide - Index and middle extended, move left (your left)"
  },
  "end": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 1, 1, 1],
    "main_axis_x": 1,
    "main_axis_y": 1,
    "delta_x": 0.0,
    "delta_y": 0.0,
    "is_static": true,
    "description": "End - All fingers extended, static hold"
  },
  "home": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 0, 0, 0, 0],
    "main_axis_x": 1,
    "main_axis_y": 1,
    "delta_x": 0.0,
    "delta_y": 0.0,
    "is_static": true,
    "description": "Home - Only thumb extended, static hold"
  },
  "end_present": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 1, 1, 1],
    "main_axis_x": 1,
    "main_axis_y": 0,
    "delta_x": -0.114914,
    "delta_y": 0.0,
    "is_static": false,
    "description": "End present - All fingers extended, move right"
  },
  "start_present": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [1, 1, 1, 1, 1],
    "main_axis_x": 1,
    "main_axis_y": 0,
    "delta_x": 0.115876,
    "delta_y": 0.0,
    "is_static": false,
    "description": "Start present - All fingers extended, move left"
  },
  "zoom_in_slide": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [0, 1, 1, 0, 0],
    "main_axis_x": 0,
    "main_axis_y": 1,
    "delta_x": 0.0,
    "delta_y": -0.166767,
    "is_static": false,
    "description": "Zoom in slide - Index and middle extended, move up"
  },
  "zoom_out_slide": {
    "left_fingers": [0, 0, 0, 0, 0],
    "right_fingers": [0, 1, 1, 0, 0],
    "main_axis_x": 0,
    "main_axis_y": 1,
    "delta_x": 0.0,
    "delta_y": 0.189989,
    "is_static": false,
    "description": "Zoom out slide - Index and middle extended, move down"
  }
};

// Modern spinner component
function ModernSpinner({ firstTime }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        <div className="mt-4 text-lg font-semibold text-white drop-shadow-lg">{t('gesturePractice.recognizing')}</div>
        {firstTime && (
          <div className="mt-2 text-sm text-gray-200 opacity-80">{t('gesturePractice.firstTimeLoad')}</div>
        )}
      </div>
    </div>
  );
}

function GesturePracticeML({ gestureName, onClose, theme = 'dark' }) {
  const { t } = useTranslation();
  // Debug gesture name
  console.log('🎯 GesturePracticeML received gestureName:', gestureName);
  console.log('🎨 Theme received:', theme);
  console.log('📋 Available templates:', Object.keys(GESTURE_TEMPLATES));
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const initializingRef = useRef(false);
  const frameCountRef = useRef(0); // For throttling FPS
  
  // State management - WITH REF TRACKING
  const [practiceState, setPracticeState] = useState("IDLE");
  const [gestureSequence, setGestureSequence] = useState([]);
  const [prevLeftFist, setPrevLeftFist] = useState(false);
  const [attemptStats, setAttemptStats] = useState({ correct: 0, wrong: 0 });
  const [statusMessage, setStatusMessage] = useState('');
  const [currentHandInfo, setCurrentHandInfo] = useState('');
  
  // Practice limit system
  const [attemptCount, setAttemptCount] = useState(0);
  const [showFinalResult, setShowFinalResult] = useState(false);
  const [attemptHistory, setAttemptHistory] = useState([]); // Track each attempt with result and error
  const maxAttempts = 5;
  
  // Loading state
  const [loading, setLoading] = useState(true); // Show loading by default
  const [gestureList, setGestureList] = useState([]); // List of available gestures
  const [selectedGesture, setSelectedGesture] = useState(''); // Selected gesture name
  const frameDrawCountRef = useRef(0);
  // Detect first time user
  const [firstTime, setFirstTime] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('hasVisitedPractice')) {
      setFirstTime(true);
      localStorage.setItem('hasVisitedPractice', '1');
    }
  }, []);
  
  // Fetch available gestures
  useEffect(() => {
    const fetchGestures = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/gestures/labels', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setGestureList(response.data);
      } catch (error) {
        console.error('Failed to fetch gestures:', error);
        toast.error('Failed to load gestures');
      }
    };
    fetchGestures();
  }, []);
  
  // Demo loading handler (move this inside the component)
  const startPractice = useCallback(() => {
    setLoading(true);
    setPracticeState('LOADING');
    setTimeout(() => {
      setLoading(false);
      setPracticeState('PRACTICING');
    }, 1500);
  }, []);
  
  // Hide loading when camera/video is ready
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleReady = () => setLoading(false);
    video.addEventListener('canplay', handleReady);
    video.addEventListener('loadedmetadata', handleReady);
    return () => {
      video.removeEventListener('canplay', handleReady);
      video.removeEventListener('loadedmetadata', handleReady);
    };
  }, []);
  
  // Helper: sleep for ms
  function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

  // Helper function to handle attempt completion
  const handleAttemptResult = useCallback(async (isCorrect, message, errorType = '') => {
    // Show message (with reason if wrong)
    let displayMsg = message;
    let displayColor = isCorrect ? '#22d3ee' : '#f87171'; // cyan for correct, red for wrong
    if (!isCorrect && errorType) {
      displayMsg = `${message} (${errorType})`;
    }
    setStatusMessage(<span style={{color: displayColor, fontWeight: 600}}>{displayMsg}</span>);
    setPracticeState('FEEDBACK');
    await sleep(1000); // Show feedback 1s

    setAttemptCount(prev => {
      const newAttemptCount = prev + 1;
      if (newAttemptCount >= maxAttempts) {
        setShowFinalResult(true);
      } else {
        setStatusMessage('');
        setPracticeState('IDLE');
        practiceStateRef.current = 'IDLE';
      }
      return newAttemptCount;
    });

    setAttemptHistory(prevHistory => {
      const newAttempt = {
        attempt: prevHistory.length + 1,
        result: isCorrect ? 'correct' : 'wrong',
        error: isCorrect ? '' : errorType,
        message: displayMsg
      };
      return [...prevHistory, newAttempt];
    });
    if (isCorrect) {
      setAttemptStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setAttemptStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }
  }, [maxAttempts]);

  
  // Add refs to track actual values
  const practiceStateRef = useRef("IDLE");
  const prevLeftFistRef = useRef(false);
  const gestureSequenceRef = useRef([]);
  
  // Add timestamp to prevent double evaluation  
  const lastEvalTimeRef = useRef(0);
  
  // Static gesture tracking
  const [staticHoldStartTime, setStaticHoldStartTime] = useState(null);
  const [staticPositions, setStaticPositions] = useState([]);
  const staticRequiredDuration = 1000;
  
  // Map gesture names from database to template names
  const gestureNameMapping = {
    "Rotate_down": "rotate_down",
    "Rotate_left": "rotate_left", 
    "Rotate_right": "rotate_right",
    "Rotate_up": "rotate_up",
    "Zoom_in": "zoom_in",
    "Zoom_out": "zoom_out",
    "Previous_slide": "previous_slide",
    "Next_slide": "next_slide",
    "End": "end",
    "Home": "home"
  };
  
  const templateName = gestureNameMapping[gestureName] || gestureName.toLowerCase();
  const template = GESTURE_TEMPLATES[templateName];
  
  console.log('🔄 Gesture mapping:', {
    originalName: gestureName,
    mappedName: templateName,
    templateExists: !!template,
    templateData: template,
    availableTemplates: Object.keys(GESTURE_TEMPLATES)
  });
  
  // Finger state detection - IMPROVED PYTHON LOGIC PORT
  const getFingerStates = useCallback((landmarks, isLeftHand = false) => {
    if (!landmarks || landmarks.length < 21) return [0, 0, 0, 0, 0];
    
    const fingers = [0, 0, 0, 0, 0];
    
    // Get key landmarks
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];      // Thumb tip
    const thumbIp = landmarks[3];       // Thumb IP joint  
    const thumbMcp = landmarks[2];      // Thumb MCP joint
    const indexMcp = landmarks[5];      // Index MCP joint
    const mcpMiddle = landmarks[9];     // Middle MCP
    const mcpPinky = landmarks[17];     // Pinky MCP

    // Determine palm orientation
    const v1 = [mcpMiddle.x - wrist.x, mcpMiddle.y - wrist.y];
    const v2 = [mcpPinky.x - wrist.x, mcpPinky.y - wrist.y];
    const crossZ = v1[0] * v2[1] - v1[1] * v2[0];
    const palmFacing = crossZ > 0 ? 1 : -1;

    // IMPROVED THUMB DETECTION (4 methods combined)
    
    // Method 1: Distance from thumb tip to palm center
    const palmCenterX = (indexMcp.x + mcpPinky.x) / 2;
    const palmCenterY = (indexMcp.y + mcpPinky.y) / 2;
    const thumbToPalmDist = Math.sqrt(
      Math.pow(thumbTip.x - palmCenterX, 2) + Math.pow(thumbTip.y - palmCenterY, 2)
    );
    
    // Method 2: Thumb extension check (tip vs MCP joint)
    const thumbExtendedX = Math.abs(thumbTip.x - thumbMcp.x) > 0.04; // Extended horizontally
    const thumbExtendedY = Math.abs(thumbTip.y - thumbMcp.y) > 0.03; // Extended vertically
    
    // Method 3: Relative position check (handedness-aware)
    let thumbPositionOpen = false;
    const handednessLabel = isLeftHand ? "Left" : "Right";
    
    if (handednessLabel === "Right") {
      if (palmFacing > 0) {
        thumbPositionOpen = thumbTip.x < thumbIp.x;
      } else {
        thumbPositionOpen = thumbTip.x > thumbIp.x;
      }
    } else {
      if (palmFacing > 0) {
        thumbPositionOpen = thumbTip.x < thumbIp.x;
      } else {
        thumbPositionOpen = thumbTip.x > thumbIp.x;
      }
    }
    
    // Method 4: Angle-based detection (thumb joints alignment)
    const angleBetweenPoints = (p1, p2, p3) => {
      const v1 = [p1.x - p2.x, p1.y - p2.y];
      const v2 = [p3.x - p2.x, p3.y - p2.y];
      
      const dotProduct = v1[0] * v2[0] + v1[1] * v2[1];
      const mag1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
      const mag2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
      
      if (mag1 === 0 || mag2 === 0) return 0;
      
      const cosAngle = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
      return (Math.acos(cosAngle) * 180) / Math.PI;
    };
    
    const thumbAngle = angleBetweenPoints(thumbMcp, thumbIp, thumbTip);
    const thumbStraight = thumbAngle > 140; // Straight thumb (extended)
    
    // COMBINED THUMB DECISION (Multiple criteria with OR logic)
    const distanceOpen = thumbToPalmDist > 0.08;
    const extensionOpen = thumbExtendedX || thumbExtendedY;
    const angleOpen = thumbStraight;
    
    // Use OR logic - if any method detects open thumb AND position check passes
    const thumbIsOpen = (distanceOpen || extensionOpen || angleOpen) && thumbPositionOpen;
    fingers[0] = thumbIsOpen ? 1 : 0;
    
    // Other fingers - simple tip vs MCP comparison
    fingers[1] = landmarks[8].y < landmarks[6].y ? 1 : 0;   // Index: tip vs PIP
    fingers[2] = landmarks[12].y < landmarks[10].y ? 1 : 0; // Middle: tip vs PIP
    fingers[3] = landmarks[16].y < landmarks[14].y ? 1 : 0; // Ring: tip vs PIP
    fingers[4] = landmarks[20].y < landmarks[18].y ? 1 : 0; // Pinky: tip vs PIP
    
    console.log('✋ Final finger states:', fingers);
    return fingers;
  }, []);
  
  // Static progress calculation
  const getStaticProgress = useCallback(() => {
    if (!staticHoldStartTime) return "0%";
    const elapsed = Date.now() - staticHoldStartTime;
    const progress = Math.min(100, (elapsed / staticRequiredDuration) * 100);
    return `${Math.round(progress)}%`;
  }, [staticHoldStartTime, staticRequiredDuration]);
  
  // Handle static gesture - FIXED LOGIC
  const handleStaticGesture = useCallback((rightFingers, wrist, currentTime) => {
    if (!template || !template.is_static) {
      console.log('🔵 Not a static gesture, skipping...');
      return;
    }
    
    const targetFingers = template.right_fingers;
    const fingersMatch = rightFingers.every((f, i) => f === targetFingers[i]);
    
    console.log(`🔵 Static ${gestureName}: [${rightFingers.join(',')}] vs [${targetFingers.join(',')}] = ${fingersMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    
    if (fingersMatch) {
      if (!staticHoldStartTime) {
        console.log('🔵 ✅ MATCH! Starting timer...');
        setStaticHoldStartTime(currentTime);
        setStaticPositions([{ x: wrist.x, y: wrist.y }]);
      } else {
        setStaticPositions(prev => [...prev, { x: wrist.x, y: wrist.y }]);
        const holdDuration = currentTime - staticHoldStartTime;
        if (holdDuration % 200 < 50) { // Log every ~200ms
          console.log(`🔵 ⏱️ Holding: ${(holdDuration/1000).toFixed(1)}s / 1.0s`);
        }
      }
    } else {
      if (staticHoldStartTime) {
        console.log('🔵 ❌ Lost match - timer reset');
        setStaticHoldStartTime(null);
        setStaticPositions([]);
      }
    }
  }, [template?.right_fingers, staticHoldStartTime, staticRequiredDuration, gestureName]);
  
  // Evaluate gesture using ML prediction
  const evaluateGesture = useCallback(async () => {
    // Prevent double evaluation with timestamp cooldown
    const now = Date.now();
    if (now - lastEvalTimeRef.current < 1500) {
      console.log('⚠️ Evaluation cooldown active, skipping...');
      return;
    }
    
    lastEvalTimeRef.current = now;
    // Reduce logging for performance
    // console.log('🔍 Starting ML evaluation...');
    
    const currentSequence = gestureSequenceRef.current;
    // console.log('🔍 Evaluating gesture with REF, sequence length:', currentSequence.length);
    
    if (currentSequence.length === 0) {
      setStatusMessage(t('gesturePractice.noData'));
      setPracticeState("IDLE");
      practiceStateRef.current = "IDLE";
      return;
    }
    
    if (!gestureName) {
      setStatusMessage(t('gesturePractice.noTemplate'));
      setPracticeState("IDLE");
      practiceStateRef.current = "IDLE";
      return;
    }
    
    setStatusMessage(t('gesturePractice.evaluating'));
    
    try {
      // Calculate average RIGHT HAND finger states
      const avgFingers = [0, 0, 0, 0, 0];
      for (const frame of currentSequence) {
        for (let i = 0; i < 5; i++) {
          avgFingers[i] += frame.fingers[i];
        }
      }
      for (let i = 0; i < 5; i++) {
        avgFingers[i] = Math.round(avgFingers[i] / currentSequence.length);
      }
      
      // Calculate motion features (matching training_session_ml.py)
      let motionFeatures = {
        delta_x: 0,
        delta_y: 0,
        main_axis_x: 0,
        main_axis_y: 0,
        raw_dx: 0,
        raw_dy: 0,
        delta_magnitude: 0,
        motion_left: 0,
        motion_right: 0,
        motion_up: 0,
        motion_down: 0
      };

      if (currentSequence.length >= 2) {
        const startWrist = currentSequence[0].wrist;
        const endWrist = currentSequence[currentSequence.length - 1].wrist;
        const deltaX = -(endWrist.x - startWrist.x); // Flip for selfie camera (user facing)
        const deltaY = endWrist.y - startWrist.y;
        const deltaMag = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Determine main axis (matching training script logic)
        let mainX, mainY, deltaXWeighted, deltaYWeighted;
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
          mainX = 1;
          mainY = 0;
          deltaXWeighted = deltaX;
          deltaYWeighted = 0;
        } else {
          mainX = 0;
          mainY = 1;
          deltaXWeighted = 0;
          deltaYWeighted = deltaY;
        }

        motionFeatures = {
          main_axis_x: mainX,
          main_axis_y: mainY,
          delta_x: deltaXWeighted,
          delta_y: deltaYWeighted,
          raw_dx: deltaX,
          raw_dy: deltaY,
          delta_magnitude: deltaMag,
          motion_left: deltaX < 0 ? 1.0 : 0.0,
          motion_right: deltaX > 0 ? 1.0 : 0.0,
          motion_up: deltaY < 0 ? 1.0 : 0.0,
          motion_down: deltaY > 0 ? 1.0 : 0.0
        };
      }
      
      // Call API to predict
      const response = await axios.post('http://localhost:5000/api/gestures/practice/predict', {
        left_fingers: [0, 0, 0, 0, 0], // Left hand ignored
        right_fingers: avgFingers,
        motion_features: motionFeatures,
        target_gesture: gestureName,
        duration: currentSequence.length * (1000/30) / 1000 // Duration in seconds
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const result = response.data;
      
      console.log('🤖 ML Evaluation result:', result);
      
      if (result.success) {
        handleAttemptResult(true, result.reason_msg);
        toast.success(t('gesturePractice.perfect', { gestureName }));
      } else {
        handleAttemptResult(false, result.reason_msg, result.reason_code);
        toast.error(`Wrong: ${result.reason_msg}`);
      }
      
    } catch (error) {
      console.error('Prediction error:', error);
      handleAttemptResult(false, t('gesturePractice.evaluationError'), 'API Error');
    }
  }, [gestureSequence, gestureName, handleAttemptResult, t]);
  
  // MediaPipe results handler
  const onResults = useCallback((results) => {
    const canvas = canvasRef.current;
    const canvasCtx = canvas?.getContext('2d');
    if (!canvas || !canvasCtx) {
      console.log('❌ Canvas not available');
      return;
    }
    
    // Throttle to ~10 FPS (process every 3rd frame) for better performance
    frameCountRef.current += 1;
    if (frameCountRef.current % 3 !== 0) {
      return;
    }
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    
    // Check for hand presence
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
      setCurrentHandInfo('❌ No hands detected - Please put your hands in front of the camera');
      setStatusMessage('Waiting for hands...');
      canvasCtx.restore();
      return;
    }
    
    if (results.multiHandLandmarks && results.multiHandedness) {
      let leftHand = null, rightHand = null;
      
      for (let index = 0; index < results.multiHandLandmarks.length; index++) {
        const classification = results.multiHandedness[index];
        const landmarks = results.multiHandLandmarks[index];
        
        console.log(`Hand ${index}: Label="${classification.label}", Score=${classification.score}`);
        
        // MediaPipe Web camera mirrored - SWAP labels
        if (classification.label === 'Left') {
          rightHand = landmarks;  // MediaPipe "Left" = User's right hand
          console.log('� Right hand detected (MediaPipe labeled as Left)');
        } else if (classification.label === 'Right') {
          leftHand = landmarks;   // MediaPipe "Right" = User's left hand  
          console.log('� Left hand detected (MediaPipe labeled as Right)');
        }
        
        // Draw landmarks with natural colors
        // const isUserLeftHand = classification.label === 'Right'; // MediaPipe "Right" = User's left
        // drawLandmarks(canvasCtx, landmarks, isUserLeftHand ? '#FFB347' : '#FF8C69');
      }
      
      processGestures(leftHand, rightHand);
    }
    
    canvasCtx.restore();
    
    // Hide loading spinner after 3 frames + ensure browser rendered
    if (frameDrawCountRef.current < 3) {
      frameDrawCountRef.current += 1;
      if (frameDrawCountRef.current === 3) {
        window.requestAnimationFrame(() => {
          setTimeout(() => setLoading(false), 120);
        });
      }
    }
  }, []);
  
  // Draw landmarks
  const drawLandmarks = useCallback((ctx, landmarks, color = '#FF0000') => {
    ctx.fillStyle = color;
    for (const landmark of landmarks) {
      const x = landmark.x * canvasRef.current.width;
      const y = landmark.y * canvasRef.current.height;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, []);
  
  // Main gesture processing - SIMPLIFIED
  const processGestures = useCallback((leftHand, rightHand) => {
    let info = '🖐️ ';
    
    // Debug hand presence
    console.log('🖐️ processGestures called - Left:', !!leftHand, 'Right:', !!rightHand);
    
    if (!leftHand || !rightHand) {
      setCurrentHandInfo(`❌ Missing hands - Left: ${!!leftHand}, Right: ${!!rightHand}`);
      return;
    }
    
    const leftFingers = getFingerStates(leftHand, true);
    const rightFingers = getFingerStates(rightHand, false);
    
    // LEFT FIST = chỉ check 4 ngón sau (bỏ qua ngón cái)
    const currentLeftFist = leftFingers.slice(1).every(f => f === 0); // [1,2,3,4] = index,middle,ring,pinky
    
    info += `Left[${leftFingers.join(',')}] Right[${rightFingers.join(',')}] `;
    
    // Use refs for current values
    const currentPracticeState = practiceStateRef.current;
    const currentPrevFist = prevLeftFistRef.current;
    
    console.log('🎯 GESTURE STATE (REF-BASED):', {
      stateProp: practiceState,
      stateRef: currentPracticeState,
      leftFist: currentLeftFist, 
      prevFistProp: prevLeftFist,
      prevFistRef: currentPrevFist,
      leftFingers,
      rightFingers
    });
    
    // Simple state logging với 4-finger fist logic
    if (currentLeftFist !== currentPrevFist) {
      console.log(`🖐️ Left fist state changed: ${currentLeftFist ? 'CLOSED' : 'OPEN'} (4-finger check: [${leftFingers.slice(1).join(',')}] all zero)`);
    }
    
    // REF-BASED STATE MANAGEMENT - LEFT HAND TRIGGERS ONLY
    if (template) {
      // Start recording when fist detected
      if (currentLeftFist && !currentPrevFist && currentPracticeState === "IDLE") {
        console.log('🚀 REF-BASED: STARTING RECORDING');
        practiceStateRef.current = "RECORDING";
        setPracticeState("RECORDING");
        setGestureSequence([]);
        gestureSequenceRef.current = [];
        setStaticHoldStartTime(null);
        setStaticPositions([]);
        
        if (template.is_static) {
          setStatusMessage(t('gesturePractice.staticHold', { gestureName }));
        } else {
          setStatusMessage(t('gesturePractice.recording', { gestureName }));
        }
        info += '🚀 RECORDING! ';
      }
      
      // Stop recording when fist released 
      if (!currentLeftFist && currentPrevFist && currentPracticeState === "RECORDING") {
        console.log('✋ REF-BASED: STOPPING RECORDING');
        practiceStateRef.current = "EVALUATING";
        setPracticeState("EVALUATING");
        // UPDATE STATE WITH RECORDED DATA FROM REF
        setGestureSequence([...gestureSequenceRef.current]);
        setTimeout(() => evaluateGesture(), 100);
        info += '🔍 EVALUATING! ';
      }
      
      // Record RIGHT HAND gesture data ONLY
      if (currentPracticeState === "RECORDING") {
        const wrist = rightHand[0];
        
        // ONLY RIGHT HAND DATA - no left hand influence
        const frameData = {
          fingers: rightFingers,           // ONLY right hand fingers
          wrist: { x: wrist.x, y: wrist.y }, // ONLY right hand wrist
          timestamp: Date.now()
        };
        
        // ACCUMULATE IN REF ONLY - NO STATE UPDATE DURING RECORDING
        gestureSequenceRef.current.push(frameData);
        
        if (template.is_static) {
          // Reduce logging frequency for performance
          if (gestureSequenceRef.current.length % 5 === 0) { // Log every 5 frames
            console.log(`🔵 CALLING handleStaticGesture - rightFingers: [${rightFingers.join(',')}]`);
          }
          handleStaticGesture(rightFingers, wrist, Date.now());
          info += ` 🔵 STATIC:${getStaticProgress()}`;
        } else {
          info += ` 🔴 FRAMES:${gestureSequenceRef.current.length}`;
        }
      }
      
      if (currentLeftFist) info += '👊 FIST! ';
      info += ` | State: ${currentPracticeState}`;
    }
    
    // Update both state and ref
    setPrevLeftFist(currentLeftFist);
    prevLeftFistRef.current = currentLeftFist;
    setCurrentHandInfo(info);
  }, [practiceState, prevLeftFist, template, gestureName, getFingerStates, handleStaticGesture, getStaticProgress, gestureSequence.length, evaluateGesture]);
  
  // Initialize MediaPipe with better cleanup
  useEffect(() => {
    let mounted = true;
    let hands = null;
    let camera = null;
    
    const initializeMediaPipe = async () => {
      try {
        if (!mounted || initializingRef.current) return;
        
        initializingRef.current = true;
        console.log('🚀 Initializing MediaPipe...');
        
        // Cleanup any existing instances
        if (handsRef.current) {
          handsRef.current.close?.();
          handsRef.current = null;
        }
        
        if (cameraRef.current) {
          cameraRef.current.stop();
          cameraRef.current = null;
        }
        
        hands = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        hands.setOptions({
          maxNumHands: 2,  // Detect both hands
          modelComplexity: 0,  // Low complexity for speed
          minDetectionConfidence: 0.5, // Increased for better performance
          minTrackingConfidence: 0.5 // Increased for better performance
        });
        
        hands.onResults(onResults);
        handsRef.current = hands;
        
        if (!mounted) return;
        
        console.log('📹 Starting camera...');
        
        if (videoRef.current) {
          camera = new Camera(videoRef.current, {
            onFrame: async () => {
              if (handsRef.current && videoRef.current && mounted) {
                await handsRef.current.send({ image: videoRef.current });
              }
            },
            width: 320,
            height: 240
          });
          
          cameraRef.current = camera;
          
          camera.h.onloadedmetadata = () => {
            if (mounted) console.log('✅ Camera loaded successfully');
          };
          
          await camera.start();
          if (mounted) console.log('✅ Camera started successfully');
        }
      } catch (error) {
        if (mounted) {
          console.error('❌ Error initializing MediaPipe:', error);
          toast.error(t('gesturePractice.cameraInitFailed'));
        }
      } finally {
        initializingRef.current = false;
      }
    };
    
    // Add delay to ensure DOM is ready
    const timer = setTimeout(initializeMediaPipe, 100);
    
    return () => {
      mounted = false;
      initializingRef.current = false;
      clearTimeout(timer);
      
      console.log('🛑 Cleaning up MediaPipe...');
      
      if (camera) {
        camera.stop();
      }
      
      if (hands) {
        hands.close?.();
      }
      
      // Clear refs
      handsRef.current = null;
      cameraRef.current = null;
    };
  }, [onResults]);
  
  // Sync refs with state
  useEffect(() => {
    practiceStateRef.current = practiceState;
    console.log('🔄 State synced:', practiceState);
  }, [practiceState]);
  
  useEffect(() => {
    prevLeftFistRef.current = prevLeftFist;
  }, [prevLeftFist]);
  
  useEffect(() => {
    gestureSequenceRef.current = gestureSequence;
  }, [gestureSequence]);
  
  // Note: Removed auto-complete timer to prevent double evaluation
  // Static gestures only evaluate when user releases left fist
  
  // Set initial status message
  useEffect(() => {
    if (template) {
      setStatusMessage(t('gesturePractice.practiceStart', { gestureName }));
    }
  }, [gestureName, template, t]);
  
  const resetStats = () => {
    setAttemptStats({ correct: 0, wrong: 0 });
    toast.info(t('gesturePractice.statsReset'));
  };
  
  const endSession = () => {
    // Cleanup MediaPipe and camera
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    setPracticeState('IDLE');
    setAttemptHistory([]);
    setAttemptStats({ correct: 0, wrong: 0 });
    setStatusMessage(t('gesturePractice.sessionEnded'));
    toast.info(t('gesturePractice.sessionEnded'));
  };
  
  if (!template) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-4">{t('gesturePractice.gestureNotFound')}</h2>
          <p>{t('gesturePractice.gestureNotFoundDesc', { gestureName })}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }
  


  // Summary popup after 5 attempts
  if (showFinalResult) {
    console.log('🎯 SUMMARY POPUP RENDERING - This should be DARK theme!');
    const accuracy = attemptStats.correct + attemptStats.wrong > 0 ? 
      Math.round((attemptStats.correct / (attemptStats.correct + attemptStats.wrong)) * 100) : 0;
    
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
          <motion.div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div 
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1b26] shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
          >
            {/* Summary Header */}
            <div className="p-6 border-b border-white/10 bg-black/20 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-cyan-500/20 flex items-center justify-center mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{t('gesturePractice.practiceComplete')}</h2>
              <p className="text-gray-400 mt-1 text-sm">
                {gestureName} • 5 {t('gesturePractice.attemptsCompleted')}
              </p>
            </div>
            
            {/* Summary Stats */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                  <div className="text-2xl font-bold text-green-400">{attemptStats.correct}</div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">{t('gesturePractice.correct')}</div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                  <div className="text-2xl font-bold text-red-400">{attemptStats.wrong}</div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">{t('gesturePractice.wrong')}</div>
                </div>
                <div className="bg-black/20 rounded-xl p-3 text-center border border-white/5">
                  <div className="text-2xl font-bold text-cyan-400">{accuracy}%</div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-1">{t('gesturePractice.accuracy')}</div>
                </div>
              </div>
              
              {/* Attempt History - Only show errors */}
              {attemptHistory.some(att => att.result === 'wrong') && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                  <h3 className="font-semibold text-red-400 text-sm mb-2 flex items-center gap-2">
                    <X size={14} /> {t('gesturePractice.errorsInAttempts')}
                  </h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10">
                    {attemptHistory
                      .filter(att => att.result === 'wrong')
                      .filter((att, index, arr) => 
                        // Remove duplicates - keep only first occurrence of each attempt
                        arr.findIndex(a => a.attempt === att.attempt && a.error === att.error) === index
                      )
                      .map((att, index) => (
                        <div key={`${att.attempt}-${index}`} className="text-xs text-gray-300 flex gap-2">
                          <span className="font-mono text-gray-500">#{att.attempt}</span>
                          <span>{att.error}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Performance Message */}
              <div className={`p-3 rounded-lg text-center text-sm font-medium border ${
                accuracy >= 80 ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                accuracy >= 60 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                'bg-red-500/10 text-red-400 border-red-500/20'
              }`}>
                {accuracy >= 80 ? t('gesturePractice.excellent') :
                 accuracy >= 60 ? t('gesturePractice.goodWork') :
                 t('gesturePractice.keepPracticing')}
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-center pt-2">
                <button
                  onClick={onClose}
                  className="py-2.5 px-6 rounded-xl font-semibold text-sm transition-all
                             bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999] flex items-center justify-center px-4">
        <motion.div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        
        {loading && <ModernSpinner firstTime={firstTime} />}
        
        <motion.div 
          className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-[#1a1b26] shadow-2xl overflow-hidden"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-black/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <PlayCircle size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white capitalize">
                  {gestureName}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="bg-white/10 px-2 py-0.5 rounded text-gray-300">
                    {attemptCount}/{maxAttempts} {t('gesturePractice.attempts')}
                  </span>
                </div>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Camera Area */}
          <div className="p-6 bg-[#1a1b26]">
            <div className="relative w-[800px] h-[500px] mx-auto rounded-xl overflow-hidden border border-white/10 bg-black shadow-lg">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full h-[500px] block"
                style={{ transform: 'scaleX(-1)' }}
              />
              <video
                ref={videoRef}
                className="hidden"
                autoPlay
                playsInline
                muted
              />
              
              {/* Overlay Status */}
              <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${practiceState === 'RECORDING' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-xs font-medium text-white uppercase tracking-wider">
                  {practiceState === 'RECORDING' ? 'Recording' : 'Live Camera'}
                </span>
              </div>
            </div>

            {/* Status Message Bar */}
            <div className="mt-6">
              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-center backdrop-blur-sm">
                <p className="text-lg font-medium text-white flex items-center justify-center gap-2">
                  {statusMessage || t('gesturePractice.practiceStart', { gestureName })}
                </p>
                {template?.description && (
                  <p className="text-sm text-gray-400 mt-1">
                    {template.description}
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default GesturePracticeML;