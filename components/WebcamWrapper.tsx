'use client';

import React, { useRef } from 'react';
import Webcam from 'react-webcam';

type WebcamWrapperProps = {
  onCapture: (imageSrc: string) => void;
  disabled?: boolean;
};

const videoConstraints = {
  width: 400,
  height: 400,
  facingMode: 'user',
};

export default function WebcamWrapper({ onCapture, disabled = false }: WebcamWrapperProps) {
  const webcamRef = useRef<Webcam>(null);

  const handleCapture = () => {
    if (disabled) return;
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      onCapture(imageSrc);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="rounded"
        style={{ width: 400, height: 400, objectFit: 'cover' }}
      />
      <button
        onClick={handleCapture}
        className={`mt-4 px-6 py-2 rounded bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50`}
        disabled={disabled}
        tabIndex={0}
        aria-disabled={disabled}
        type="button"
      >
        Capture
      </button>
    </div>
  );
}
