import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { GESTURE_DATABASE } from '../utils/gestureDatabase';

const PracticePython = ({ gestureName, onClose }) => {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [status, setStatus] = useState('idle');
  const [stats, setStats] = useState({ correct: 0, wrong: 0, total: 0, accuracy: 0 });
  const [lastResult, setLastResult] = useState(null);
  
  // Get gesture info
  const gestureInfo = GESTURE_DATABASE[gestureName];

  // Initialize camera
  useEffect(() => {
    let currentStream = null;
    let isComponentMounted = true;
    
    const initCamera = async () => {
      // Prevent double initialization
      if (currentStream || !isComponentMounted) {
        console.log('Camera already initializing or component unmounted');
        return;
      }
      
      try {
        console.log('Requesting camera access...');
        
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported by browser');
        }
        
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false
        });
        
        if (!isComponentMounted) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        console.log('Camera access granted, stream:', mediaStream);
        console.log('Stream active:', mediaStream.active);
        console.log('Stream tracks:', mediaStream.getTracks());
        
        currentStream = mediaStream;
        
        // Wait a bit and ensure video element exists
        await new Promise(resolve => setTimeout(resolve, 50));
        
        if (videoRef.current && isComponentMounted) {
          console.log('Setting srcObject to video element');
          const video = videoRef.current;
          
          video.srcObject = mediaStream;
          
          // Add error handler
          video.onerror = (error) => {
            console.error('Video element error:', error);
            toast.error(t('practicePython.videoError'));
          };
          
          // Handle video loading and playing more safely
          video.onloadedmetadata = () => {
            console.log('Video metadata loaded, dimensions:', 
              video.videoWidth, 'x', video.videoHeight);
            if (isComponentMounted) {
              video.play().catch(error => {
                console.error('Video play error:', error);
                toast.error(t('practicePython.videoPlayFailed'));
              });
            }
          };
          
          video.oncanplay = () => {
            console.log('Video can play');
          };
          
          video.onplaying = () => {
            console.log('Video is playing - camera feed should be visible');
            toast.success(t('practicePython.cameraReady'));
          };
          
          // Force load and play
          video.load();
        } else {
          console.error('Video ref is null or component unmounted!');
        }
        
        if (isComponentMounted) {
          setStream(mediaStream);
        }
      } catch (error) {
        console.error('Camera access failed:', error);
        if (error.name === 'NotAllowedError') {
          toast.error(t('practicePython.cameraDenied'));
        } else if (error.name === 'NotFoundError') {
          toast.error(t('practicePython.noCamera'));
        } else {
          toast.error(t('practicePython.cameraError', { error: error.message }));
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initCamera, 100);
    
    return () => {
      isComponentMounted = false;
      clearTimeout(timer);
      
      // Stop camera stream on cleanup
      if (currentStream) {
        console.log('Stopping camera stream');
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capture and send frames
  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !sessionActive) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw current frame (mirror horizontally to match display)
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    
    // Convert to base64
    const frameData = canvas.toDataURL('image/jpeg', 0.8);
    
    try {
      // Send frame to backend
      const response = await fetch('/api/practice/frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          gestureId: gestureName,
          frameData
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send frame');
      }
    } catch (error) {
      console.error('Frame sending error:', error);
    }
  }, [gestureName, sessionActive]);

  // Start practice session
  const startSession = async () => {
    try {
      console.log('Starting practice session for:', gestureName);
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'Present' : 'Missing');
      console.log('Token value:', token);
      
      const response = await fetch('/api/practice/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ gestureId: gestureName })
      });
      
      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      const result = await response.json();
      console.log('Response data:', result);
      
      if (result.success) {
        setSessionActive(true);
        setStatus('ready');
        toast.success(t('practicePython.sessionStarted'));
        
        // Start sending frames every 200ms (5 FPS)
        intervalRef.current = setInterval(captureFrame, 200);
        
        // Start polling for updates
        pollSessionStatus();
      } else {
        toast.error(result.message || t('practicePython.sessionStartFailed'));
      }
    } catch (error) {
      console.error('Start session error:', error);
      toast.error(t('practicePython.sessionStartFailed'));
    }
  };

  // Stop practice session
  const stopSession = useCallback(async () => {
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const response = await fetch('/api/practice/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ gestureId: gestureName })
      });
      
      setSessionActive(false);
      setStatus('idle');
      toast.info(t('practicePython.sessionStopped'));
    } catch (error) {
      console.error('Stop session error:', error);
    }
  }, [gestureName, t]);

  // Poll session status for updates
  const pollSessionStatus = () => {
    const poll = async () => {
      if (!sessionActive) return;
      
      try {
        const response = await fetch(`/api/practice/status/${gestureName}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const status = await response.json();
        
        if (status.active) {
          setStats(status.stats || stats);
          if (status.lastResult) {
            setLastResult(status.lastResult);
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    };
    
    // Poll every 1 second
    const pollInterval = setInterval(poll, 1000);
    
    // Cleanup on session end
    return () => clearInterval(pollInterval);
  };

  // Reset session
  const resetSession = async () => {
    try {
      const response = await fetch('/api/practice/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ gestureId: gestureName })
      });
      
      if (response.ok) {
        setStats({ correct: 0, wrong: 0, total: 0, accuracy: 0 });
        setLastResult(null);
        toast.success(t('practicePython.sessionReset'));
      }
    } catch (error) {
      console.error('Reset error:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('Component unmounting - cleaning up');
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      // Stop session if active
      if (sessionActive) {
        stopSession();
      }
    };
  }, [sessionActive, stopSession]);

  if (!gestureInfo) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-4">{t('common.error')}</h3>
          <p>{t('practicePython.gestureNotFound', { gestureName })}</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-90vh overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">{t('practicePython.title', { gestureName })}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        {/* Status */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-lg font-medium">
            {t('practicePython.status')} <span className={sessionActive ? 'text-green-600' : 'text-gray-600'}>
              {sessionActive ? t('practicePython.active') : t('practicePython.inactive')}
            </span>
          </p>
          {lastResult && (
            <p className={`mt-2 ${lastResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {t('practicePython.last')} {lastResult.message}
            </p>
          )}
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-4 gap-4 text-center">
          <div className="bg-green-100 p-3 rounded">
            <div className="text-2xl font-bold text-green-600">{stats.correct}</div>
            <div className="text-sm text-green-600">{t('practicePython.correct')}</div>
          </div>
          <div className="bg-red-100 p-3 rounded">
            <div className="text-2xl font-bold text-red-600">{stats.wrong}</div>
            <div className="text-sm text-red-600">{t('practicePython.wrong')}</div>
          </div>
          <div className="bg-blue-100 p-3 rounded">
            <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
            <div className="text-sm text-blue-600">{t('practicePython.total')}</div>
          </div>
          <div className="bg-yellow-100 p-3 rounded">
            <div className="text-2xl font-bold text-yellow-600">{stats.accuracy}%</div>
            <div className="text-sm text-yellow-600">{t('practicePython.accuracy')}</div>
          </div>
        </div>

        {/* Gesture Info */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">{t('practicePython.gestureTemplate')}</h3>
          <p><strong>{t('practicePython.fingers')}</strong> {gestureInfo.fingers?.join(', ')}</p>
          <p><strong>{t('practicePython.motion')}</strong> [{gestureInfo.delta?.[0]?.toFixed(2)}, {gestureInfo.delta?.[1]?.toFixed(2)}]</p>
        </div>

        {/* Video */}
        <div className="mb-4 flex flex-col items-center">
          <div className="relative">
            <video
              ref={videoRef}
              className="rounded-lg border-2 border-gray-300"
              width="640"
              height="480"
              autoPlay
              muted
              playsInline
              style={{ 
                backgroundColor: '#f0f0f0',
                transform: 'scaleX(-1)' // Mirror effect để tay không bị ngược
              }}
            />
            {!stream && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-lg">
                <div className="text-center">
                  <div className="text-4xl mb-2">📹</div>
                  <p className="text-gray-600">{t('practicePython.initializingCamera')}</p>
                </div>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          
          {/* Camera debug info */}
          <div className="mt-2 text-sm text-gray-600">
            {t('practicePython.streamStatus')} {stream ? t('practicePython.connected') : t('practicePython.notConnected')}
            {stream && (
              <span className="ml-2 text-green-600">✓ {t('practicePython.cameraReady')}</span>
            )}
          </div>
          
          {/* Debug controls */}
          <div className="mt-2 space-x-2">
            <button
              onClick={() => {
                if (videoRef.current && stream) {
                  console.log('Manual setup video');
                  videoRef.current.srcObject = stream;
                  videoRef.current.load();
                  videoRef.current.play().catch(console.error);
                } else {
                  console.log('Video ref or stream not available');
                }
              }}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded"
            >
              {t('practicePython.fixVideo')}
            </button>
            <button
              onClick={async () => {
                try {
                  console.log('Testing API without auth');
                  const response = await fetch('/api/practice/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ gestureId: gestureName })
                  });
                  console.log('Test API status:', response.status);
                  const result = await response.json();
                  console.log('Test API result:', result);
                } catch (error) {
                  console.error('Test API error:', error);
                }
              }}
              className="px-3 py-1 text-xs bg-orange-500 text-white rounded"
            >
              {t('practicePython.testApi')}
            </button>
            <button
              onClick={() => {
                console.log('=== DEBUG INFO ===');
                console.log('Stream:', stream);
                console.log('Stream active:', stream?.active);
                if (videoRef.current) {
                  console.log('Video element:');
                  console.log('- srcObject:', videoRef.current.srcObject);
                  console.log('- readyState:', videoRef.current.readyState);
                  console.log('- videoWidth:', videoRef.current.videoWidth);
                  console.log('- videoHeight:', videoRef.current.videoHeight);
                  console.log('- paused:', videoRef.current.paused);
                } else {
                  console.log('Video ref is null!');
                }
              }}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded"
            >
              {t('practicePython.debugInfo')}
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold mb-2">{t('practicePython.instructions')}</h4>
          <ol className="list-decimal list-inside text-sm space-y-1">
            <li>{t('practicePython.instruction1')}</li>
            <li>{t('practicePython.instruction2')}</li>
            <li>{t('practicePython.instruction3')}</li>
            <li>{t('practicePython.instruction4')}</li>
            <li>{t('practicePython.instruction5')}</li>
            <li>{t('practicePython.instruction6')}</li>
          </ol>
        </div>

        {/* Controls */}
        <div className="flex justify-center space-x-4">
          {!sessionActive ? (
            <button
              onClick={startSession}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              {t('practicePython.startSession')}
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              {t('practicePython.stopSession')}
            </button>
          )}
          
          <button
            onClick={resetSession}
            disabled={!sessionActive}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:bg-gray-300"
          >
            {t('practicePython.resetStats')}
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PracticePython;