'use client';

import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { useRouter } from 'next/navigation';

const videoConstraints = {
  width: 1024,
  height: 1024,
  facingMode: "user",
};

export default function WebcamWrapper() {
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const router = useRouter();

  // Replace with your actual unsigned upload preset name
  const CLOUDINARY_UPLOAD_PRESET = 'comiccover';
  const CLOUDINARY_CLOUD_NAME = 'djm1jppes';

  const captureAndUpload = async () => {
    setError(null);

    if (!webcamRef.current) {
      setError("Webcam not ready");
      return;
    }

    setLoading(true);
    // Capture PNG screenshot
    const screenshot = webcamRef.current.getScreenshot();
    setPreview(screenshot || null);

    if (!screenshot) {
      setError("Failed to capture selfie.");
      setLoading(false);
      return;
    }

    try {
      // Convert base64 PNG to a Blob
      const byteString = atob(screenshot.split(',')[1]);
      const mimeString = screenshot.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', blob, 'selfie.png');
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );
      const uploadData = await uploadRes.json();

      if (!uploadData.secure_url) {
        setError("Upload failed.");
        setLoading(false);
        return;
      }

      // Save selfieUrl to localStorage for next page/use
      localStorage.setItem('selfieUrl', uploadData.secure_url);

      // Optional: move to next page
      router.push('/comic/result');
    } catch (err) {
      setError("Unexpected error: " + (err as any)?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-black rounded-2xl">
      <div className="border-4 border-yellow-400 rounded-xl overflow-hidden">
        <Webcam
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/png"
          width={400}
          height={400}
          videoConstraints={videoConstraints}
          mirrored
        />
      </div>
      {preview && (
        <img
          src={preview}
          alt="Selfie Preview"
          className="mt-4 w-64 h-64 rounded-xl border border-gray-400"
        />
      )}
      <button
        className="px-8 py-3 rounded-xl text-lg font-bold bg-yellow-400 text-black hover:bg-yellow-500 transition"
        onClick={captureAndUpload}
        disabled={loading}
      >
        {loading ? "Uploading..." : "Capture & Upload Selfie"}
      </button>
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
