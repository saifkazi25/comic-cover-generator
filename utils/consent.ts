// utils/consent.ts
export const CONSENT_VERSION = "policy-v1.0";
const KEY = `consent:${CONSENT_VERSION}`;

export type ConsentRecord = {
  accepted: boolean;
  ts: number; // epoch ms
};

export function getConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ConsentRecord) : null;
  } catch {
    return null;
  }
}

export function setConsent() {
  if (typeof window === "undefined") return;
  const rec: ConsentRecord = { accepted: true, ts: Date.now() };
  localStorage.setItem(KEY, JSON.stringify(rec));
}

export function clearConsent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
