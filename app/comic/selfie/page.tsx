'use client';

import React, { useState } from 'react';
import WebcamWrapper from '../../../components/WebcamWrapper';
import { useRouter } from 'next/navigation';

export default function SelfiePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  // Handle selfie capture
  const handleCapture = async (dataUrl: string) => {
    setPreview(dataUrl);
    setUploading(true);

    try {
      // 1) turn dataURL into a real Blob (PNG)
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // 2) upload that Blob so Cloudinary stores the full camera resolution
      const formData = new FormData();
      formData.append('file', blob, 'selfie.png');
      formData.append('upload_preset', 'comiccover');

      const uploadRes = await fetch(
        'https://api.cloudinary.com/v1_1/djm1jppes/image/upload',
        {
          method: 'POST',
          body: formData,
        }
      );
      const uploadData = await uploadRes.json();
      const selfieUrl = uploadData.secure_url as string;

      // 3) stash and go
      localStorage.setItem('selfieUrl', selfieUrl);
      router.push('/comic/result');
    } catch (err) {
      console.error('Upload failed', err);
      alert('Sorry, could not upload your selfie. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h2 className="text-2xl font-bold mb-4">Capture Your Selfie</h2>

      {/* Webcam */}
      {!preview && (
        <div className="w-[400px] h-[400px] rounded overflow-hidden mb-4 border border-gray-500">
          <WebcamWrapper onCapture={handleCapture} disabled={uploading} />
        </div>
      )}

      {/* Preview & Uploading */}
      {preview && (
        <div className="flex flex-col items-center">
          <img
            src={preview}
            alt="Selfie preview"
            className="rounded shadow-lg max-w-xs mb-2"
          />
          {uploading ? (
            <p className="text-sm text-gray-600 mt-2">Uploading selfie…</p>
          ) : (
            <button
              onClick={() => {
                /* if you wanted a “retake” button */
                setPreview(null);
              }}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
            >
              Retake
            </button>
          )}
        </div>
      )}
    </div>
  );
}
