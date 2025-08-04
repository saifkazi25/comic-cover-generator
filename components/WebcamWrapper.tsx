'use client';

import React, { useRef } from 'react';
import Webcam from 'react-webcam';

export type WebcamWrapperProps = {
  onCapture: (imageSrc: string) => void;
  disabled?: boolean;
};

const DISPLAY_SIZE = 400;
const CAPTURE_SIZE = 1280;

export default function WebcamWrapper({
  onCapture,
  disabled = false,
}: WebcamWrapperProps) {
  const webcamRef = useRef<Webcam>(null);

  const handleCapture = () => {
    if (disabled) return;
    const imageSrc = webcamRef.current?.getScreenshot({
      width: CAPTURE_SIZE,
      height: CAPTURE_SIZE,
    });
    if (imageSrc) onCapture(imageSrc);
  };

  return (
    <div className="flex flex-col items-center">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/png"
        screenshotQuality={1}
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
