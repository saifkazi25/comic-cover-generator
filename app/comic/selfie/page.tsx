'use client';

import React, { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import WebcamWrapper from '../../../components/WebcamWrapper'; // adjust path if needed
import Webcam from 'react-webcam';

export default function SelfieDebugPage() {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();

  const handleCapture = async () => {
    if (!webcamRef.current) {
      console.error('🚫 Webcam reference is null.');
      alert('Webcam not available.');
      return;
    }

    setLoading(true);
    const screenshot = webcamRef.current.getScreenshot();

    if (!screenshot) {
      console.error('❌ Screenshot is null.');
      alert('Failed to capture selfie.');
      setLoading(false);
      return;
    }

    console.log('📸 Captured base64 image:', screenshot);
    setPreview(screenshot); // Show preview for debug

    try {
      const formData = new FormData();
      formData.append('file', screenshot);
      formData.append('upload_preset', 'comiccover');

      console.log('⬆️ Uploading to Cloudinary...');
      const res = await fetch(`https://api.cloudinary.com/v1_1/djm1jppes/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      console.log('✅ Cloudinary upload response:', data);

      if (!data.secure_url) {
        throw new Error('Missing secure_url from Cloudinary response.');
      }

      localStorage.setItem('selfieUrl', data.secure_url);
      console.log('📦 Saved selfieUrl to localStorage:', data.secure_url);
      router.push('/comic/result');
    } catch (error) {
      console.error('❌ Upload failed:', error);
      alert('Upload to Cloudinary failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-black text-white">
      <h1 className="text-2xl font-bold mb-4">📷 Capture Your Superhero Selfie</h1>

      <div className="w-[400px] h-[400px] rounded overflow-hidden mb-4 border border-gray-500">
        <WebcamWrapper webcamRef={webcamRef} />
      </div>

      {preview && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">🖼 Preview</h2>
          <img src={preview} alt="Captured Selfie" className="w-64 border rounded" />
        </div>
      )}

      <button
        onClick={handleCapture}
        disabled={loading}
        className="mt-6 bg-blue-600 px-6 py-3 rounded text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Uploading...' : 'Capture & Continue'}
      </button>
    </div>
  );
}
  