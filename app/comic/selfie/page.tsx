'use client';

import React, { useState } from 'react';
import WebcamWrapper from '../../../components/WebcamWrapper';
import { useRouter } from 'next/navigation';

export default function SelfiePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const handleCapture = async (dataUrl: string) => {
    setPreview(dataUrl);
    setUploading(true);

    try {
      // Turn dataURL → Blob to preserve full resolution
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      const formData = new FormData();
      formData.append('file', blob, 'selfie.png');
      formData.append('upload_preset', 'comiccover');

      const uploadRes = await fetch(
        'https://api.cloudinary.com/v1_1/djm1jppes/image/upload',
        { method: 'POST', body: formData }
      );
      const uploadData = (await uploadRes.json()) as { secure_url: string };
      localStorage.setItem('selfieUrl', uploadData.secure_url);

      router.push('/comic/result');
    } catch (e) {
      console.error('Upload failed', e);
      alert('Sorry, upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-6">
      <h2 className="text-2xl font-bold mb-4">Capture Your Selfie</h2>

      {!preview && (
        <div className="w-[400px] h-[400px] rounded overflow-hidden border border-gray-500">
          <WebcamWrapper onCapture={handleCapture} disabled={uploading} />
        </div>
      )}

      {preview && (
        <div className="flex flex-col items-center">
          <img
            src={preview}
            alt="Selfie preview"
            className="rounded shadow-lg max-w-xs mb-2"
          />
          {uploading ? (
            <p className="text-sm text-gray-600 mt-2">Uploading…</p>
          ) : (
            <button
              onClick={() => setPreview(null)}
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
