import React, { useState, useRef, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import { X, Zap } from 'lucide-react';
import { customizeGesture, checkGestureConflict, getGestureStatuses, createOrUpdateGestureRequest } from '../services/gestureService';

const REQUIRED_SAMPLES = 5;
const MIN_FRAMES = 12;

const smoothPoints = (points) => {
  if (points.length <= 2) return points;
  return points.map((point, idx) => {
    const prev = points[idx - 1] ?? point;
    const next = points[idx + 1] ?? point;
    return {
      x: (prev.x + point.x + next.x) / 3,
      y: (prev.y + point.y + next.y) / 3,
    };
  });
};

const getFingerStates = (landmarks, isLeftHand = false) => {
  const states = [0, 0, 0, 0, 0];
  if (!landmarks) return states;

  const wrist = landmarks[0];
  const mcp_middle = landmarks[9];
  const mcp_pinky = landmarks[17];
  const v1 = [mcp_middle.x - wrist.x, mcp_middle.y - wrist.y];
  const v2 = [mcp_pinky.x - wrist.x, mcp_pinky.y - wrist.y];
  const cross_z = v1[0] * v2[1] - v1[1] * v2[0];
  const palm_facing = cross_z > 0 ? 1 : -1;

  if (isLeftHand) {
    if (palm_facing > 0) {
      states[0] = landmarks[4].x < landmarks[3].x ? 1 : 0;
    } else {
      states[0] = landmarks[4].x > landmarks[3].x ? 1 : 0;
    }
  } else {
    if (palm_facing > 0) {
      states[0] = landmarks[4].x < landmarks[3].x ? 1 : 0;
    } else {
      states[0] = landmarks[4].x > landmarks[3].x ? 1 : 0;
    }
  }

  states[1] = landmarks[8].y < landmarks[6].y ? 1 : 0;
  states[2] = landmarks[12].y < landmarks[10].y ? 1 : 0;
  states[3] = landmarks[16].y < landmarks[14].y ? 1 : 0;
  states[4] = landmarks[20].y < landmarks[18].y ? 1 : 0;
  return states;
};

const isFist = (handLandmarks) => {
  if (!handLandmarks) return false;
  let bent = 0;
  if (handLandmarks[8].y > handLandmarks[5].y) bent += 1;
  if (handLandmarks[12].y > handLandmarks[9].y) bent += 1;
  if (handLandmarks[16].y > handLandmarks[13].y) bent += 1;
  if (handLandmarks[20].y > handLandmarks[17].y) bent += 1;
  return bent >= 3;
};

const buildSampleFromBuffer = (buffer, leftStates, rightStates, poseLabel, instanceId) => {
  const smoothed = smoothPoints(buffer);
  const first = smoothed[0];
  const middle = smoothed[Math.floor(smoothed.length / 2)];
  const last = smoothed[smoothed.length - 1];
  const deltaX = -(last.x - first.x); // Flip for mirrored camera
  const deltaY = last.y - first.y;
  const mainAxisX = Math.abs(deltaX) >= Math.abs(deltaY) ? 1 : 0;
  const mainAxisY = Math.abs(deltaY) > Math.abs(deltaX) ? 1 : 0;

  return {
    instance_id: instanceId,
    pose_label: poseLabel,
    left_finger_state: leftStates ?? [0, 0, 0, 0, 0],
    right_finger_state: rightStates ?? [0, 0, 0, 0, 0],
    motion_x_start: first.x,
    motion_y_start: first.y,
    motion_x_mid: middle.x,
    motion_y_mid: middle.y,
    motion_x_end: last.x,
    motion_y_end: last.y,
    main_axis_x: mainAxisX,
    main_axis_y: mainAxisY,
    delta_x: deltaX,
    delta_y: deltaY,
  };
};

function GestureCustomization({
  gestureName,
  admin,
  onClose,
  onCompleted,
  resetSession = false,
  theme = 'dark',
  gestureRequestStatus: gestureRequestStatusProp = 'disabled',
  handleRequestCustomization: handleRequestCustomizationProp,
  setGestureRequestStatus: setGestureRequestStatusProp,
  isRequesting: isRequestingProp,
  isChecking: isCheckingProp,
}) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const handsRef = useRef(null);
  const cameraRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle, recording, success, error
  const [message, setMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [hasShownConflictError, setHasShownConflictError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [samples, setSamples] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(t('gestureCustomization.putTwoHands'));
  const [tempMessage, setTempMessage] = useState(null); // Temporary message to show for 1s
  const [tempMessageType, setTempMessageType] = useState(null); // 'error' or 'success'
  const [pendingGestures, setPendingGestures] = useState([]); // collected gestures in this session
  const [localGestureRequestStatus, setLocalGestureRequestStatus] = useState(gestureRequestStatusProp);
  const [localRequesting, setLocalRequesting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false); // Track completion status
  const [isGestureBlocked, setIsGestureBlocked] = useState(false); // Whether this specific gesture is blocked

  useEffect(() => {
    if (typeof setGestureRequestStatusProp === 'function') return;
    setLocalGestureRequestStatus(gestureRequestStatusProp);
  }, [gestureRequestStatusProp, setGestureRequestStatusProp]);

  const effectiveGestureRequestStatus =
    typeof setGestureRequestStatusProp === 'function'
      ? gestureRequestStatusProp
      : localGestureRequestStatus;
  const isRequesting =
    typeof isRequestingProp === 'boolean' ? isRequestingProp : localRequesting;
  const isChecking = typeof isCheckingProp === 'boolean' ? isCheckingProp : false;

  const uploadingRef = useRef(false);
  const recordingStateRef = useRef('WAIT');
  const bufferRef = useRef([]);
  const currentLeftStateRef = useRef([0, 0, 0, 0, 0]);
  const currentRightStateRef = useRef([0, 0, 0, 0, 0]);
  const instanceCounterRef = useRef(1);
  const prevLeftFistRef = useRef(false);

  // Clear temporary messages after 1 second
  useEffect(() => {
    if (tempMessage) {
      const timer = setTimeout(() => {
        setTempMessage(null);
        setTempMessageType(null);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [tempMessage]);

  useEffect(() => {
    setSamples([]);
    setStatus('recording'); // Auto start recording
    setMessage('');
    setIsCompleted(false); // Reset completion status
    setStatusMessage('Ready to record.');
    setIsUploading(false);
    setHasShownConflictError(false); // Reset conflict error flag
    recordingStateRef.current = 'WAIT';
    bufferRef.current = [];
    instanceCounterRef.current = 1;

    // Check if gesture is blocked
    if (isGestureBlocked) {
      setStatus('blocked');
      setStatusMessage(t('gestureCustomization.gestureUnavailableDesc'));
      setMessage(t('gestureCustomization.gestureUnavailable'));
      return;
    }

    // Create AdminGestureRequest when starting recording
    if (admin && gestureName && !isGestureBlocked) {
      (async () => {
        try {
          await createOrUpdateGestureRequest({
            adminId: admin?.id || admin?._id,
            gestureId: gestureName,
            status: 'customed'
          });
          console.log(`AdminGestureRequest created for gesture: ${gestureName}`);
        } catch (error) {
          console.warn('Failed to create AdminGestureRequest:', error);
          // Don't block recording if this fails
        }
      })();
    }
  }, [gestureName, admin, isGestureBlocked]);

  // Load gesture status for blocking logic
  useEffect(() => {
    const loadGestureStatus = async () => {
      if (!admin) return;

      try {
        const response = await getGestureStatuses();
        
        // Check if this specific gesture is blocked or customed
        const thisGestureRequest = response.data.requests?.find(r => r.gestureId === gestureName);
        setIsGestureBlocked(thisGestureRequest?.status === 'blocked' || thisGestureRequest?.status === 'customed');
      } catch (error) {
        console.warn('Failed to load gesture status:', error);
        setIsGestureBlocked(false); // Default to not blocked if API fails
      }
    };

    loadGestureStatus();
  }, [admin, gestureName]);

  // Auto-hide error after 1 second
  useEffect(() => {
    if (status === 'error' && message) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [status, message]);

  const updateGestureRequestStatus = useCallback(
    (nextStatus) => {
      if (typeof setGestureRequestStatusProp === 'function') {
        setGestureRequestStatusProp((prev) => {
          if (prev && typeof prev === 'object' && !Array.isArray(prev)) {
            return { ...prev, [gestureName]: nextStatus };
          }
          return nextStatus;
        });
      }
      setLocalGestureRequestStatus(nextStatus);
    },
    [setGestureRequestStatusProp, gestureName]
  );

  const handleStartNewRecording = useCallback(async () => {
    setIsCompleted(false);
    setStatus('recording');
    setMessage('');
    setStatusMessage(t('gestureCustomization.putTwoHands'));
    setSamples([]);
    setIsUploading(false);
    setHasShownConflictError(false);
    recordingStateRef.current = 'WAIT';
    bufferRef.current = [];
    instanceCounterRef.current = 1;

    // Restart camera
    if (cameraRef.current) {
      try {
        await cameraRef.current.start();
      } catch (err) {
        console.warn('Failed to restart camera:', err);
      }
    }
  }, []);

  const handleCustomizationRequest = useCallback(async () => {
    if (typeof handleRequestCustomizationProp === 'function') {
      await handleRequestCustomizationProp();
      return;
    }

    // Logic moved to main page - do nothing here
    toast.info(t('gestureCustomization.useSubmitButton'));
  }, [handleRequestCustomizationProp, t]);

  const handleSampleCompleted = useCallback(
    async (sample) => {
      // Check for conflict before adding sample
      try {
        setStatusMessage(t('gestureCustomization.checkingConflicts'));
        const conflictResult = await checkGestureConflict({
          leftStates: sample.leftStates || sample.left_finger_state || [0, 0, 0, 0, 0],
          rightStates: sample.rightStates || sample.right_finger_state || [0, 0, 0, 0, 0],
          deltaX: sample.deltaX || sample.delta_x || 0,
          deltaY: sample.deltaY || sample.delta_y || 0,
        });

        if (conflictResult.conflict) {
          setTempMessage(t('gestureCustomization.conflictDetected') + conflictResult.message);
          setTempMessageType('error');
          setStatusMessage(t('gestureCustomization.conflictDetectedDesc'));
          return; // Don't add the conflicting sample
        }
      } catch (err) {
        console.warn('Conflict check failed, proceeding anyway:', err);
        // If conflict check fails, continue with sample collection
      }

      setSamples((prev) => {
        const updated = [...prev, sample];
        setStatusMessage(`${updated.length}/${REQUIRED_SAMPLES}`);
        if (updated.length >= REQUIRED_SAMPLES && !uploadingRef.current) {
          uploadingRef.current = true;
          setIsUploading(true);
          (async () => {
            setStatus('recording');
            setMessage(t('gestureCustomization.uploadingSamples'));
            setStatusMessage(t('gestureCustomization.uploadingSamplesDesc'));
            try {
              const resp = await customizeGesture({
                adminId: admin?.id || admin?._id,
                gestureName,
                samples: updated,
              });
              const successMsg = resp?.message || t('gestureCustomization.uploadedSuccess');
              setTempMessage(t('gestureCustomization.uploadedSuccessShort'));
              setTempMessageType('success');
              toast.success(t('gestureCustomization.customizationUploaded', { gestureName }));
              toast.success(t('gestureCustomization.customizationUploaded', { gestureName }));
              if (onCompleted) {
                onCompleted(gestureName);
              }
              // add to pending gestures so admin can request multiple gestures in one session
              setPendingGestures((prev) => {
                const exists = prev.find((p) => p.gestureName === gestureName);
                if (exists) return prev;
                return [
                  ...prev,
                  {
                    gestureName,
                    validation: resp?.validation || null,
                    rawFile: resp?.rawFile || null,
                    masterFile: resp?.masterFile || null,
                    timestamp: Date.now(),
                  },
                ];
              });
              // reset samples so user can record next gesture
              uploadingRef.current = false;
              setIsUploading(false);
              setSamples([]);
              setHasShownConflictError(false); // Reset conflict error flag for next gesture
              setStatusMessage(t('gestureCustomization.readyNext'));
              setIsCompleted(true); // Mark as completed only after all success logic
            } catch (err) {
              const detail = err?.response?.data?.detail;
              const errorMessage = detail || err?.response?.data?.message || t('gestureCustomization.uploadFailed');
              console.error('Upload error:', err?.response?.data);
              setStatus('error');
              setMessage(errorMessage);
              toast.error(errorMessage);
              uploadingRef.current = false;
              setIsUploading(false);
              setSamples([]); // Reset samples on upload failure
              setHasShownConflictError(false); // Reset conflict error flag
              setStatusMessage(t('gestureCustomization.uploadFailedDesc'));
            }
          })();
        }
        return updated;
      });
    },
    [admin, gestureName, isUploading, onClose, t]
  );

  const onResults = useCallback(
    (results) => {
      const canvas = canvasRef.current;
      const canvasCtx = canvas?.getContext('2d');
      if (!canvas || !canvasCtx) return;

      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      const hands = [];
      if (results.multiHandLandmarks && results.multiHandedness) {
        results.multiHandLandmarks.forEach((landmarks, idx) => {
          const mpLabel = results.multiHandedness[idx]?.label || 'Left';
          // Camera feed mirrored horizontally, swap labels to match user's view
          const userLabel = mpLabel === 'Left' ? 'Right' : 'Left';
          hands.push({ handedness: userLabel, landmarks });
          for (const landmark of landmarks) {
            const x = landmark.x * canvas.width;
            const y = landmark.y * canvas.height;
            canvasCtx.beginPath();
            canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
            canvasCtx.fillStyle = '#FFCC00';
            canvasCtx.fill();
          }
        });
      }
      canvasCtx.restore();
      if (loading) setLoading(false);

      const leftHand = hands.find((hand) => hand.handedness === 'Left');
      const rightHand = hands.find((hand) => hand.handedness === 'Right');

      const leftPresent = Boolean(leftHand);
      const rightPresent = Boolean(rightHand);

      const leftStates = getFingerStates(leftHand?.landmarks, true);
      const rightStates = getFingerStates(rightHand?.landmarks, false);
      const currentLeftFist = isFist(leftHand?.landmarks);
      const prevLeftFist = prevLeftFistRef.current;

      const wrist = rightHand?.landmarks?.[0];

      if (!leftPresent || !rightPresent) {
        recordingStateRef.current = 'WAIT';
        bufferRef.current = [];
        prevLeftFistRef.current = false;
        if (!isUploading) {
          setStatusMessage(t('gestureCustomization.needBothHands'));
        }
        return;
      }

      if (recordingStateRef.current === 'WAIT') {
        if (!isUploading) {
          setStatusMessage(t('gestureCustomization.putTwoHandsStart'));
        }
        if (!isUploading && currentLeftFist && !prevLeftFist && wrist) {
          recordingStateRef.current = 'RECORD';
          bufferRef.current = [];
          currentLeftStateRef.current = leftStates;
          currentRightStateRef.current = rightStates;
          setHasShownConflictError(false); // Reset conflict error flag for new recording session
          setStatusMessage(t('gestureCustomization.recording'));
        }
      } else if (recordingStateRef.current === 'RECORD') {
        if (wrist) {
          bufferRef.current.push({ x: wrist.x, y: wrist.y });
        }
        if (!currentLeftFist && prevLeftFist) {
          recordingStateRef.current = 'PROCESS';
        }
      } else if (recordingStateRef.current === 'PROCESS') {
        const buffer = bufferRef.current;
        recordingStateRef.current = 'WAIT';
        if (!buffer || buffer.length < MIN_FRAMES) {
          setTempMessage(t('gestureCustomization.sampleTooShort'));
          setTempMessageType('error');
          return;
        }
        const sample = buildSampleFromBuffer(
          buffer,
          currentLeftStateRef.current,
          currentRightStateRef.current,
          gestureName,
          instanceCounterRef.current
        );
        console.log('Sample captured:', {
          leftStates: currentLeftStateRef.current,
          rightStates: currentRightStateRef.current,
          deltaX: sample.delta_x,
          deltaY: sample.delta_y,
          poseLabel: sample.pose_label
        });
        instanceCounterRef.current += 1;
        bufferRef.current = [];
        setTempMessage(t('gestureCustomization.sampleCaptured'));
        setTempMessageType('success');
        handleSampleCompleted(sample);
      }

      prevLeftFistRef.current = currentLeftFist;
    },
    [loading, gestureName, handleSampleCompleted, isUploading]
  );

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });
    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    handsRef.current = hands;

    const startCamera = async () => {
      if (!videoRef.current) return;
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && handsRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });
      cameraRef.current = camera;
      await camera.start();
    };

    startCamera();

    return () => {
      cameraRef.current?.stop();
      cameraRef.current = null;
      handsRef.current?.close();
      handsRef.current = null;
    };
  }, []);

  useEffect(() => {
    handsRef.current?.onResults(onResults);
  }, [onResults]);

  // Stop camera when gesture collection is completed
  useEffect(() => {
    console.log('[GestureCustomization] isCompleted changed:', isCompleted);
    if (isCompleted && cameraRef.current) {
      console.log('[GestureCustomization] Stopping camera due to completion');
      cameraRef.current.stop();
    }
  }, [isCompleted]);

  const handleRemovePending = (name) => {
    setPendingGestures((prev) => prev.filter((p) => p.gestureName !== name));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl shadow-xl max-w-2xl w-full ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className={`flex justify-between items-center p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className="text-xl font-bold">{t('gestureCustomization.title', { gestureName })}</h2>
          <button onClick={onClose} className={`p-2 rounded-full ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
            <X size={24} />
          </button>
        </div>

        <div className="p-6 relative">
          {loading && status === 'idle' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 z-10 rounded-lg">
              <p>{t('gestureCustomization.loadingCamera')}</p>
            </div>
          )}
          {status === 'blocked' && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-90 z-10 rounded-lg">
              <div className="text-center text-white">
                <div className="text-2xl font-bold mb-4">{t('gestureCustomization.gestureUnavailable')}</div>
                <p className="mb-6">{t('gestureCustomization.gestureUnavailableDesc')}</p>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold text-white"
                >
                  {t('common.close')}
                </button>
              </div>
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="w-full rounded-lg border border-gray-600"
            style={{ transform: 'scaleX(-1)' }}
          />
          <video ref={videoRef} className="hidden" autoPlay playsInline muted />
          <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-white text-sm ${
            tempMessageType === 'error' 
              ? 'bg-red-600/90' 
              : tempMessageType === 'success'
                ? 'bg-green-600/90'
                : 'bg-black/60'
          }`}>
            {tempMessage || statusMessage}
          </div>
          {showError && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-red-900/90 text-red-100 text-sm max-w-xs text-center">
              {message}
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col items-center gap-4 border-t border-gray-700 w-full">
          {status === 'success' && (
            <div className="w-full mt-2 px-4 py-2 rounded bg-green-900/80 text-green-100 text-sm">
              <strong>{t('common.success')}:</strong> {message}
            </div>
          )}
          {pendingGestures.length > 0 && (
            <div className="w-full mt-3 px-4 py-2 rounded bg-gray-800/70 text-sm">
              <div className="font-semibold mb-2">{t('gestureCustomization.pending')}</div>
              <ul className="space-y-1">
                {pendingGestures.map((p) => (
                  <li key={p.gestureName} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{p.gestureName}</div>
                      <div className="text-xs text-gray-300">{p.validation || ''}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRemovePending(p.gestureName)}
                        className="px-3 py-1 rounded bg-red-600 text-white text-xs"
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GestureCustomization;

