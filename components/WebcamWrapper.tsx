'use client';

import React, { MutableRefObject } from 'react';
import Webcam from 'react-webcam';

const videoConstraints = {
  width: 400,
  height: 400,
  facingMode: 'user',
};

interface WebcamWrapperProps {
  webcamRef: MutableRefObject<Webcam | null>;
}

export default function WebcamWrapper({ webcamRef }: WebcamWrapperProps) {
  return (
    <Webcam
      ref={webcamRef}
      screenshotFormat="image/jpeg"
      videoConstraints={videoConstraints}
      className="w-full h-full object-cover"
      audio={false}
      mirrored={true}
      playsInline={true}
    />
  );
}
