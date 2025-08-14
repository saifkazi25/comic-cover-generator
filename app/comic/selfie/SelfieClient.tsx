// app/comic/selfie/SelfieClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import WebcamWrapper from "../../../components/WebcamWrapper";
import { useRouter, useSearchParams } from "next/navigation";

// ✅ Consent helpers & modal (make sure these files exist as per previous step)
import ConsentModal from "../../../components/ConsentModal";
import { getConsent, setConsent } from "../../../utils/consent";

export default function SelfieClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Consent state
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);

  // If launched with ?data=…, persist the quiz answers
  useEffect(() => {
    const data = params.get("data");
    if (data) {
      localStorage.setItem("comicInputs", data);
    }
  }, [params]);

  // Initialize consent status on mount
  useEffect(() => {
    const rec = getConsent();
    setHasConsent(Boolean(rec?.accepted));
  }, []);

  // Only capture a still and show preview — do NOT upload yet
  const handleCapture = (dataUrl: string) => {
    // Guard: require consent before capturing
    if (!hasConsent) {
      setConsentOpen(true);
      return;
    }
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

      if (!uploadRes.ok) {
        const msg = await uploadRes.text();
        throw new Error(`Cloudinary upload failed: ${msg}`);
      }

      const json = await uploadRes.json();
      const selfieUrl = json?.secure_url as string | undefined;

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

  // Accept consent from modal
  const acceptConsent = () => {
    setConsent();
    setHasConsent(true);
    setConsentOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-bold">Capture Your Selfie</h2>

      {/* Lightweight consent banner */}
      {hasConsent === false && (
        <div className="w-full max-w-xl rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <div className="mb-1 font-medium">We need your permission</div>
          <p className="text-neutral-700">
            We store your selfie and the generated comic on our secure cloud to
            process and deliver your result. Default retention: <strong>90 days</strong>.
            Read our{" "}
            <a
              href="/privacy"
              className="underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              Privacy Policy & Disclaimer
            </a>
            .
          </p>
          <div className="mt-3">
            <button
              onClick={() => setConsentOpen(true)}
              className="rounded-xl bg-black px-4 py-2 text-white"
            >
              Review & Agree
            </button>
          </div>
        </div>
      )}

      {/* Main capture area */}
      {!preview ? (
        <div
          className={`mb-4 h-[400px] w-[400px] rounded border border-gray-500 ${
            hasConsent ? "opacity-100" : "pointer-events-none opacity-40"
          }`}
          aria-disabled={!hasConsent}
        >
          <WebcamWrapper
            onCapture={handleCapture}
            disabled={uploading || !hasConsent}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <img
            src={preview}
            alt="Selfie preview"
            className="mb-3 max-w-xs rounded shadow-lg"
          />

          <div className="flex gap-3">
            <button
              onClick={handleRetake}
              disabled={uploading}
              className={`rounded px-4 py-2 text-white ${
                uploading
                  ? "cursor-not-allowed bg-gray-500"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              Retake
            </button>

            <button
              onClick={handleUseThisPhoto}
              disabled={uploading}
              className={`rounded px-4 py-2 text-white ${
                uploading
                  ? "cursor-not-allowed bg-gray-500"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {uploading ? "Uploading…" : "Use this photo"}
            </button>
          </div>
        </div>
      )}

      {/* Consent modal (opens when user needs to agree) */}
      <ConsentModal
        open={Boolean(consentOpen)}
        onAccept={acceptConsent}
        onClose={() => setConsentOpen(false)}
      />
    </div>
  );
}
