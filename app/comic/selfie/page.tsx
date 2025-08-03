'use client';

import React, { useState } from 'react';
import WebcamWrapper from '../../../components/WebcamWrapper';
import { useRouter } from 'next/navigation';

export default function SelfiePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  // Handle selfie capture
  const handleCapture = async (imageSrc: string) => {
    setPreview(imageSrc);
    setUploading(true);

    // Upload to Cloudinary (replace with your unsigned preset and cloud name)
    const formData = new FormData();
    formData.append('file', imageSrc);
    formData.append('upload_preset', 'comiccover');

    const response = await fetch('https://api.cloudinary.com/v1_1/djm1jppes/image/upload', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    const selfieUrl = data.secure_url;

    // Store to localStorage and redirect to result page
    localStorage.setItem('selfieUrl', selfieUrl);

    setUploading(false);
    router.push('/comic/result');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h2 className="text-2xl font-bold mb-4">Capture Your Selfie</h2>
      {/* Webcam */}
      {!preview && (
        <div className="w-[400px] h-[400px] rounded overflow-hidden mb-4 border border-gray-500">
          <WebcamWrapper onCapture={handleCapture} />
        </div>
      )}

      {/* Preview after capture */}
      {preview && (
        <div className="flex flex-col items-center">
          <img src={preview} alt="Selfie preview" className="rounded shadow-lg max-w-xs mb-2" />
          {uploading && <p className="text-sm text-gray-600 mt-2">Uploading selfie...</p>}
        </div>
      )}
    </div>
  );
}
