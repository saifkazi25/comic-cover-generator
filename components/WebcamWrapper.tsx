'use client';

import React, { useRef } from 'react';
import Webcam from 'react-webcam';

export type WebcamWrapperProps = {
  onCapture: (dataUrl: string) => void;
  disabled?: boolean;
};

const DISPLAY_SIZE = 400;     // UI preview size
const CAPTURE_WIDTH = 1280;   // full-res width
const CAPTURE_HEIGHT = 720;   // full-res height

export default function WebcamWrapper({
  onCapture,
  disabled = false,
}: WebcamWrapperProps) {
  const webcamRef = useRef<Webcam>(null);

  const handleCapture = () => {
    if (disabled) return;
    const dataUrl = webcamRef.current?.getScreenshot({
      width: CAPTURE_WIDTH,
      height: CAPTURE_HEIGHT,
      format: 'png',
      quality: 1,
    });
    if (dataUrl) onCapture(dataUrl);
  };

  return (
    <div className="flex flex-col items-center">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/png"
        videoConstraints={{
          facingMode: 'user',
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
        }}
        className="rounded border border-gray-300"
        style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, objectFit: 'cover' }}
      />
      <button
        onClick={handleCapture}
        disabled={disabled}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {disabled ? 'Please wait…' : 'Capture Full-Res'}
      </button>
    </div>
  );
}
