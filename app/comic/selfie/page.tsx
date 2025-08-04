'use client';

import React, { useState } from 'react';
import WebcamWrapper from '../../../components/WebcamWrapper';
import { useRouter } from 'next/navigation';

export default function SelfiePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleCapture = async (imageSrc: string) => {
    setPreview(imageSrc);
    setUploading(true);

    // Convert data-URL to Blob so Cloudinary stores full-res PNG
    const resp = await fetch(imageSrc);
    const blob = await resp.blob();

    const formData = new FormData();
    formData.append('file', blob, 'selfie.png');
    formData.append('upload_preset', 'comiccover');

    const upload = await fetch(
      'https://api.cloudinary.com/v1_1/djm1jppes/image/upload',
      { method: 'POST', body: formData }
    );
    const data = await upload.json();
    const selfieUrl: string = data.secure_url;

    localStorage.setItem('selfieUrl', selfieUrl);
    setUploading(false);
    router.push('/comic/result');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 bg-white">
      <h2 className="text-3xl font-bold">Capture Your Selfie</h2>

      {!preview ? (
        <WebcamWrapper onCapture={handleCapture} disabled={uploading} />
      ) : (
        <div className="flex flex-col items-center">
          <img
            src={preview}
            alt="Selfie preview"
            className="w-[400px] h-[400px] object-cover rounded shadow-lg mb-4"
          />
          {uploading ? (
            <p className="text-gray-600">Uploading full-res selfie…</p>
          ) : (
            <button
              onClick={() => router.push('/comic/result')}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
            >
              Continue to Generate
            </button>
          )}
        </div>
      )}
    </div>
  );
}
