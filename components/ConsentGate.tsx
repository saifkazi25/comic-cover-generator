// components/ConsentGate.tsx
"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import ConsentModal from "./ConsentModal";
import { getConsent, setConsent } from "../utils/consent";

type Props = PropsWithChildren<{
  // Optional: show a small banner even after consent is given
  showBadge?: boolean;
}>;

export default function ConsentGate({ children, showBadge = false }: Props) {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const rec = getConsent();
    setHasConsent(Boolean(rec?.accepted));
  }, []);

  function requestConsent() {
    setOpen(true);
  }

  function accept() {
    setConsent();
    setHasConsent(true);
    setOpen(false);
  }

  if (hasConsent === null) {
    // hydration safe placeholder
    return <div className="py-10 text-center text-sm text-neutral-500">Loading…</div>;
  }

  return (
    <div className="relative">
      {!hasConsent && (
        <div className="mb-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <div className="mb-2 font-medium">We need your permission</div>
          <p className="text-neutral-700">
            To continue, please agree to our privacy terms for using your selfie.
          </p>
          <div className="mt-3">
            <button
              onClick={requestConsent}
              className="rounded-xl bg-black px-4 py-2 text-white"
            >
              Review & Agree
            </button>
            <a
              href="/privacy"
              target="_blank"
              rel="noreferrer"
              className="ml-3 text-sm underline"
            >
              Read full policy
            </a>
          </div>
        </div>
      )}

      {/* Content stays mounted; disable interactions until consent */}
      <div className={hasConsent ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-40"}>
        {children}
      </div>

      {showBadge && hasConsent && (
        <div className="absolute right-0 top-0 rounded-full border bg-white px-2 py-1 text-xs">
          Consent: Granted
        </div>
      )}

      <ConsentModal open={open} onAccept={accept} onClose={() => setOpen(false)} />
    </div>
  );
}
