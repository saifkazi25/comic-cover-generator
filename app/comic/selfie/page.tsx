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
      // 1) dataURL → Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // 2) upload full‐res to Cloudinary
      const formData = new FormData();
      formData.append('file', blob, 'selfie.png');
      formData.append('upload_preset', 'comiccover');

      const uploadRes = await fetch(
        'https://api.cloudinary.com/v1_1/djm1jppes/image/upload',
        { method: 'POST', body: formData }
      );
      const { secure_url: selfieUrl } = await uploadRes.json();

      // 3) stash & redirect
      localStorage.setItem('selfieUrl', selfieUrl);
      router.push('/comic/result');
    } catch (e) {
      console.error('Upload failed', e);
      alert('Upload failed – please try again.');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h2 className="text-2xl font-bold">Capture Your Selfie</h2>

      {/* Video container only */}
      {!preview && (
        <div className="w-[400px] h-[400px] rounded border border-gray-500 mb-4">
          <WebcamWrapper onCapture={handleCapture} disabled={uploading} />
        </div>
      )}

      {/* Preview & retake */}
      {preview && (
        <div className="flex flex-col items-center">
          <img
            src={preview}
            alt="Selfie preview"
            className="rounded shadow-lg max-w-xs mb-2"
          />
          {uploading ? (
            <p className="text-gray-600">Uploading…</p>
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
