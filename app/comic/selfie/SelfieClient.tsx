// app/comic/selfie/SelfieClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import WebcamWrapper from "../../../components/WebcamWrapper";
import { useRouter, useSearchParams } from "next/navigation";
import { getConsent, setConsent } from "../../../utils/consent";

export default function SelfieClient() {
  const router = useRouter();
  const params = useSearchParams();

  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Consent state (no modal—single inline disclaimer)
  const [hasConsent, setHasConsent] = useState<boolean>(false);
  const [consentChecked, setConsentChecked] = useState(false); // to avoid flicker before we read

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
    setConsentChecked(true);
  }, []);

  // Only capture a still and show preview — do NOT upload yet
  const handleCapture = (dataUrl: string) => {
    // Should never be hit without consent since webcam isn't rendered,
    // but keep the guard for safety.
    if (!hasConsent) return;
    setPreview(dataUrl);
  };

  // Upload the current preview
  const handleUseThisPhoto = async () => {
    if (!preview) return;
    setUploading(true);
    try {
      const res = await fetch(preview);
      const blob = await res.blob();

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

      if (!selfieUrl) throw new Error("No selfie URL returned from upload");

      localStorage.setItem("selfieUrl", selfieUrl);
      localStorage.removeItem("coverImageUrl"); // force re-generate
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

  const acceptConsent = () => {
    setConsent();            // persist
    setHasConsent(true);     // unlock
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h2 className="text-2xl font-bold">Capture Your Selfie</h2>

      {/* Wait until we've read consent once to avoid UI flicker */}
      {!consentChecked ? (
        <div className="h-[420px] w-[420px] rounded-2xl bg-neutral-900/20 animate-pulse" />
      ) : (
        <>
          {/* Single, detailed disclaimer that blocks camera until accepted */}
          {!hasConsent && (
            <div className="w-full max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm text-neutral-800 shadow">
              <div className="mb-2 text-base font-semibold">
                Consent to Use Your Selfie
              </div>
              <p className="mb-3">
                We store your selfie and the generated comic on our secure cloud to
                process and deliver your result. We don’t sell your images. Some essential
                providers (AI generation &amp; storage) process them strictly to provide the
                service. <strong>Default retention: 90 days.</strong>
              </p>
              <p className="mb-3">
                By continuing, you agree to our{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2"
                >
                  Privacy Policy &amp; Disclaimer
                </a>.
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => router.back()}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  onClick={acceptConsent}
                  className="rounded-xl bg-black px-4 py-2 text-white hover:opacity-90"
                >
                  I Agree
                </button>
              </div>
            </div>
          )}

          {/* Main capture area */}
          {!preview ? (
            hasConsent ? (
              <div className="mb-4 h-[400px] w-[400px] rounded border border-gray-500">
                <WebcamWrapper
                  onCapture={handleCapture}
                  disabled={uploading}
                />
              </div>
            ) : (
              // Placeholder frame so layout stays steady while consent is pending
              <div className="mb-4 h-[400px] w-[400px] rounded border border-dashed border-gray-400 opacity-40" />
            )
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
        </>
      )}
    </div>
  );
}
