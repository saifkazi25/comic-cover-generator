'use client';

import React, { useRef } from 'react';
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

  const handleCapture = () => {
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
      />
      <button
        onClick={handleCapture}
        className="mt-4 px-6 py-2 rounded bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition"
      >
        Capture
      </button>
    </div>
  );
}
