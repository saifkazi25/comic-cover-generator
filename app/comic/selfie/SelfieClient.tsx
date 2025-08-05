// app/comic/selfie/SelfieClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import WebcamWrapper from "../../../components/WebcamWrapper";
import { useRouter, useSearchParams } from "next/navigation";

export default function SelfieClient() {
  const router = useRouter();
  const params = useSearchParams();
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // If launched with ?data=…, persist the quiz answers
  useEffect(() => {
    const data = params.get("data");
    if (data) {
      localStorage.setItem("comicInputs", data);
    }
  }, [params]);

  const handleCapture = async (dataUrl: string) => {
    setPreview(dataUrl);
    setUploading(true);

    try {
      // Convert dataURL to Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", blob, "selfie.png");
      formData.append("upload_preset", "comiccover");

      const uploadRes = await fetch(
        "https://api.cloudinary.com/v1_1/djm1jppes/image/upload",
        { method: "POST", body: formData }
      );
      const { secure_url: selfieUrl } = await uploadRes.json();

      // Persist the uploaded selfie URL
      localStorage.setItem("selfieUrl", selfieUrl);

      // Navigate to the cover result page
      router.push("/comic/result");
    } catch (e) {
      console.error("Upload failed", e);
      alert("Upload failed – please try again.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h2 className="text-2xl font-bold">Capture Your Selfie</h2>

      {!preview ? (
        <div className="w-[400px] h-[400px] rounded border border-gray-500 mb-4">
          <WebcamWrapper onCapture={handleCapture} disabled={uploading} />
        </div>
      ) : (
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
