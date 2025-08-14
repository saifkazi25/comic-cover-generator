// components/ConsentModal.tsx
"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onAccept: () => void;
  onClose: () => void;
};

export default function ConsentModal({ open, onAccept, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="rounded-2xl p-0 backdrop:bg-black/50">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Consent to Use Your Selfie</h2>
        <p className="mt-3 text-sm text-neutral-700">
          We store your selfie and the generated comic on our secure cloud to
          process and deliver your result. We don’t sell your images. Some
          essential providers (AI generation & storage) process them strictly to
          provide the service. Default retention: <strong>90 days</strong>.
        </p>
        <p className="mt-3 text-sm text-neutral-700">
          By continuing, you agree to our{" "}
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

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={onAccept}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white"
          >
            I Agree
          </button>
        </div>
      </div>
    </dialog>
  );
}
