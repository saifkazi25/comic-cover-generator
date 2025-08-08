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

  // Only capture a still and show preview — do NOT upload yet
  const handleCapture = (dataUrl: string) => {
    setPreview(dataUrl);
  };

  // Upload the current preview
  const handleUseThisPhoto = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      // Convert dataURL to Blob
      const res = await fetch(preview);
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

      if (!selfieUrl) {
        throw new Error("No selfie URL returned from upload");
      }

      // Persist the uploaded selfie URL
      localStorage.setItem("selfieUrl", selfieUrl);

      // Clear any stale cover image to force re-generate
      localStorage.removeItem("coverImageUrl");

      // Navigate to the cover result page
      router.push("/comic/result");
    } catch (e) {
      console.error("Upload failed", e);
      alert("Upload failed – please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Retake: clear preview and any previously stored selfie/cover
  const handleRetake = () => {
    setPreview(null);
    localStorage.removeItem("selfieUrl");
    localStorage.removeItem("coverImageUrl");
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
            className="rounded shadow-lg max-w-xs mb-3"
          />

          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              disabled={uploading}
              className={`px-4 py-2 rounded ${
                uploading ? "bg-gray-500 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
              } text-white`}
            >
              Retake
            </button>

            <button
              onClick={handleUseThisPhoto}
              disabled={uploading}
              className={`px-4 py-2 rounded ${
                uploading ? "bg-gray-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
              } text-white`}
            >
              {uploading ? "Uploading…" : "Use this photo"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
