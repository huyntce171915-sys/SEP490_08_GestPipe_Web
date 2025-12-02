import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const CameraPreview = ({ theme }) => {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState('');
  const streamRef = useRef(null);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsActive(true);
    } catch (err) {
      console.error('Camera error', err);
      setError(
        err.message ||
          t('cameraPreview.cameraError', { defaultValue: 'Camera error occurred.' })
      );
      setIsActive(false);
    }
  };

  const handleToggle = async () => {
    if (isActive) {
      stopStream();
      setIsActive(false);
    } else {
      await startCamera();
    }
  };

  useEffect(() => {
    return () => stopStream();
  }, []);

  return (
    <div
      className={`rounded-2xl border ${
        theme === 'dark'
          ? 'bg-gray-900/60 border-gray-700'
          : 'bg-white border-gray-200 shadow'
      } p-4 space-y-4`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3
            className={`text-lg font-semibold ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}
          >
            {t('cameraPreview.title', { defaultValue: 'Live Camera Feed' })}
          </h3>
          <p
            className={`text-sm ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {t('cameraPreview.description', { defaultValue: 'Real-time gesture recognition using MediaPipe' })}
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
            isActive
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-cyan-500 text-white hover:bg-cyan-600'
          }`}
        >
          {isActive ? t('cameraPreview.stopCamera', { defaultValue: 'Stop Camera' }) : t('cameraPreview.startCamera', { defaultValue: 'Start Camera' })}
        </button>
      </div>

      <div
        className={`relative overflow-hidden rounded-xl border ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
        } bg-black`}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full aspect-video object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-300 bg-black/60">
            {t('cameraPreview.cameraInactive', { defaultValue: 'Camera is inactive. Click to start.' })}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400">
          {error ||
            t('cameraPreview.cameraBlocked', { defaultValue: 'Camera access blocked. Please allow camera access.' })}
        </p>
      )}
    </div>
  );
};

export default CameraPreview;
