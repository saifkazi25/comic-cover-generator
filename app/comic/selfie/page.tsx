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
      // 1) Turn DataURL into a full-res Blob
      const res  = await fetch(dataUrl);
      const blob = await res.blob();

      // 2) Upload that blob so Cloudinary keeps the native size
      const formData = new FormData();
      formData.append('file', blob, 'selfie.png');
      formData.append('upload_preset', 'comiccover');

      const uploadRes  = await fetch(
        'https://api.cloudinary.com/v1_1/djm1jppes/image/upload',
        { method: 'POST', body: formData }
      );
      const { secure_url } = await uploadRes.json();

      // 3) Save & navigate
      localStorage.setItem('selfieUrl', secure_url);
      router.push('/comic/result');
    } catch (err) {
      console.error('Upload failed', err);
      alert('Could not upload your selfie—please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h2 className="text-2xl font-bold mb-4">Capture Your Selfie</h2>

      {!preview && (
        <div className="w-[400px] h-[400px] mb-4">
          <WebcamWrapper onCapture={handleCapture} disabled={uploading} />
        </div>
      )}

      {preview && (
        <div className="flex flex-col items-center">
          <img src={preview} className="rounded shadow-lg max-w-xs mb-2" />
          {uploading
            ? <p className="text-sm text-gray-600">Uploading…</p>
            : <button
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded"
                onClick={() => setPreview(null)}
              >
                Retake
              </button>}
        </div>
      )}
    </div>
  );
}
