'use client';

import React from 'react';
import Webcam from 'react-webcam';

const videoConstraints = {
  width: 400,
  height: 400,
  facingMode: 'user',
};

export default function WebcamWrapper({ webcamRef }: { webcamRef: any }) {
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
