// components/WebcamWrapper.tsx
'use client';

import React, { useRef } from 'react';
import Webcam from 'react-webcam';

export type WebcamWrapperProps = {
  onCapture: (imageSrc: string) => void;
  disabled?: boolean;
};

const DISPLAY_SIZE = 400;     // how big it looks on screen
const CAPTURE_SIZE = 1280;    // how big the actual screenshot is

export default function WebcamWrapper({
  onCapture,
  disabled = false,
}: WebcamWrapperProps) {
  const webcamRef = useRef<Webcam>(null);

  const handleCapture = () => {
    if (disabled) return;
    const imageSrc = webcamRef.current?.getScreenshot(); 
    if (imageSrc) onCapture(imageSrc);
  };

  return (
    <div className="flex flex-col items-center">
      <Webcam
        audio={false}
        ref={webcamRef}
        // tell it to snapshot as PNG at max quality
        screenshotFormat="image/png"
        screenshotQuality={1}
        // request a 1280×1280 feed from the camera
        videoConstraints={{
          facingMode: 'user',
          width: CAPTURE_SIZE,
          height: CAPTURE_SIZE,
        }}
        // but render it down to 400×400 in the UI
        style={{
          width: DISPLAY_SIZE,
          height: DISPLAY_SIZE,
          objectFit: 'cover',
          borderRadius: 8,
          border: '1px solid #ccc',
        }}
      />
      <button
        onClick={handleCapture}
        disabled={disabled}
        className="mt-4 px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition disabled:opacity-50"
      >
        {disabled ? 'Please wait…' : 'Capture Full-Res'}
      </button>
    </div>
  );
}
