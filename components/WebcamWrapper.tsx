'use client';

import React, { useRef } from 'react';
import Webcam from 'react-webcam';

export type WebcamWrapperProps = {
  onCapture: (imageSrc: string) => void;
  disabled?: boolean;
};

export default function WebcamWrapper({
  onCapture,
  disabled = false,
}: WebcamWrapperProps) {
  const webcamRef = useRef<Webcam>(null);

  const handleCapture = () => {
    if (disabled) return;
    const video = webcamRef.current?.video;
    if (!video) return;

    const videoWidth  = video.videoWidth;
    const videoHeight = video.videoHeight;

    // grab a full-res PNG screenshot
    const imageSrc = webcamRef.current?.getScreenshot({
      width: videoWidth,
      height: videoHeight,
      screenshotFormat: 'image/png',
      screenshotQuality: 1,
    });

    if (imageSrc) {
      onCapture(imageSrc);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <Webcam
        audio={false}
        ref={webcamRef}
        // show it scaled down to 400×400 in UI
        videoConstraints={{ width: 400, height: 400, facingMode: 'user' }}
        style={{ width: 400, height: 400, objectFit: 'cover', borderRadius: 8 }}
      />
      <button
        onClick={handleCapture}
        disabled={disabled}
        className="mt-4 px-6 py-2 rounded bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition disabled:opacity-50"
      >
        Capture Full-Res
      </button>
    </div>
  );
}
