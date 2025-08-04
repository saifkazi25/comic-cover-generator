'use client';

import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useRouter } from 'next/navigation';

export default function SelfiePage() {
  const webcamRef = useRef<Webcam>(null);
  const [preview, setPreview] = useState<string|null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleCapture = async () => {
    if (!webcamRef.current) return;
    const { videoWidth: w, videoHeight: h } = webcamRef.current.video!;
    // capture at full camera resolution
    const dataUrl = webcamRef.current.getScreenshot({ width: w, height: h });
    if (!dataUrl) return;

    setPreview(dataUrl);

    // convert to blob so Cloudinary stores the full-res PNG
    const resp = await fetch(dataUrl);
    const blob = await resp.blob();

    setUploading(true);
    const fd = new FormData();
    fd.append('file', blob, 'selfie.png');
    fd.append('upload_preset', 'comiccover');

    const upload = await fetch(
      'https://api.cloudinary.com/v1_1/djm1jppes/image/upload',
      { method: 'POST', body: fd }
    );
    const { secure_url } = await upload.json();

    localStorage.setItem('selfieUrl', secure_url);
    setUploading(false);
    router.push('/comic/result');
  };

  return (
    <div className="flex flex-col items-center p-8 gap-6">
      <h2 className="text-2xl font-bold">Capture Your Selfie</h2>

      {!preview ? (
        <>
          <div className="w-[400px] h-[400px] overflow-hidden rounded border">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/png"
              videoConstraints={{ facingMode: 'user', width: 1280, height: 720 }}
              className="object-cover w-full h-full"
            />
          </div>
          <button
            onClick={handleCapture}
            disabled={uploading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {uploading ? 'Uploading…' : 'Capture Full-Res'}
          </button>
        </>
      ) : (
        <img
          src={preview}
          alt="Selfie preview"
          className="w-[400px] h-[400px] object-cover rounded shadow"
        />
      )}
    </div>
  );
}
