'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

type WebcamWrapperProps = {
  onCapture: (imageSrc: string) => void;
};

const videoConstraints = {
  width: 400,
  height: 400,
  facingMode: 'user',
};

export default function WebcamWrapper({ onCapture }: WebcamWrapperProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = useCallback(() => {
    if (!webcamRef.current) {
      setError('Webcam not available');
      return;
    }
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      setError('Failed to capture image');
      return;
    }
    setError(null);
    onCapture(imageSrc);
  }, [onCapture]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="rounded-2xl shadow-lg"
        style={{ width: 400, height: 400 }}
      />
      {error && <p className="text-red-600">{error}</p>}
      <button
        type="button"
        className="px-6 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition"
        onClick={handleCapture}
        disabled={isCapturing}
      >
        {isCapturing ? 'Capturing...' : 'Capture Selfie'}
      </button>
    </div>
  );
}
