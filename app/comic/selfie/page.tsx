'use client';

import React, { useEffect, useState } from 'react';
import WebcamWrapper from '../../../components/WebcamWrapper';
import { useRouter } from 'next/navigation';

export default function SelfiePage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setPreview(null);
    setError(null);
    localStorage.removeItem('selfieUrl');
  }, []);

  const base64ToBlob = (b64: string) => {
    const [meta, data] = b64.split(',');
    const mime = meta.match(/:(.*?);/)?.[1] || '';
    const bin = atob(data);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const handleCapture = async (imageSrc: string) => {
    setPreview(imageSrc);
    setUploading(true);
    setError(null);

    try {
      const blob = base64ToBlob(imageSrc);
      const form = new FormData();
      form.append('file', blob);
      form.append('upload_preset', 'comiccover');

      const res = await fetch(
        'https://api.cloudinary.com/v1_1/djm1jppes/image/upload',
        { method: 'POST', body: form }
      );
      const data = await res.json();

      if (!res.ok || !data.secure_url) {
        throw new Error('Upload failed');
      }

      localStorage.setItem('selfieUrl', data.secure_url);
      router.push('/comic/result');
    } catch (err: unknown) {
      let message = 'Unknown error';
      if (err instanceof Error) message = err.message;
      setError(message);
      setUploading(false);
    }
  };

  const handleRetake = () => {
    setPreview(null);
    setError(null);
    setUploading(false);
    localStorage.removeItem('selfieUrl');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h2 className="text-2xl font-bold mb-4">Capture Your Selfie</h2>

      {!preview && (
        <div className="w-[400px] h-[400px] rounded mb-4 border border-gray-500">
          <WebcamWrapper onCapture={handleCapture} disabled={uploading} />
        </div>
      )}

      {preview && (
        <div className="flex flex-col items-center">
          <img
            src={preview}
            alt="Selfie Preview"
            className="rounded shadow-lg mb-2 w-80 h-80 object-cover"
          />
          {uploading ? (
            <p className="text-sm text-gray-600 mt-2">Uploading selfie...</p>
          ) : (
            <button
              onClick={handleRetake}
              className="mt-2 px-4 py-2 rounded bg-gray-300 text-gray-800"
            >
              Retake
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mt-2 text-red-600 bg-red-100 p-2 rounded">{error}</p>
      )}
    </div>
  );
}
