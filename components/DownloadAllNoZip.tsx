'use client';

import { useState } from 'react';

type FileItem = {
  url: string;           // image URL (CDN or local)
  name?: string;         // base filename without extension
  ext?: 'jpg' | 'png' | 'webp';
};

function extFromType(ct?: string | null): 'jpg' | 'png' | 'webp' {
  if (!ct) return 'jpg';
  if (ct.includes('png')) return 'png';
  if (ct.includes('webp')) return 'webp';
  return 'jpg';
}

async function fetchBlob(url: string): Promise<{ blob: Blob; ext: 'jpg'|'png'|'webp' }> {
  // Try direct first
  let resp = await fetch(url);
  if (!resp.ok) {
    // Fallback via proxy if CORS blocks
    resp = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  }
  if (!resp.ok) throw new Error(`Failed to fetch ${url}`);
  const blob = await resp.blob();
  const ext = extFromType(resp.headers.get('content-type'));
  return { blob, ext };
}

function canAnchorDownload(): boolean {
  const a = document.createElement('a');
  return typeof a.download !== 'undefined';
}

async function shareFilesOrNull(files: File[]): Promise<boolean> {
  // @ts-ignore - older TS libdom may not know canShare
  if (navigator.canShare && navigator.canShare({ files })) {
    await navigator.share({ files, title: 'My Comic', text: 'All my comic panels' });
    return true;
  }
  return false;
}

export default function DownloadAllNoZip({
  files,
  baseName = 'comic',
  delayMs = 350, // small delay between downloads to avoid popup blockers
}: {
  files: FileItem[];
  baseName?: string;
  delayMs?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onDownloadAll() {
    setBusy(true);
    setErr(null);
    try {
      // Fetch all as blobs
      const fetched = await Promise.all(
        files.map(async (f, i) => {
          const { blob, ext } = await fetchBlob(f.url);
          const filename = `${String(i + 1).padStart(2, '0')}-${(f.name || 'panel').replace(/\s+/g, '-')}.${f.ext || ext}`;
          return new File([blob], filename, { type: blob.type || 'image/jpeg' });
        })
      );

      // 1) BEST on mobile: Web Share API (no ZIP, straight to Photos/Files)
      if (await shareFilesOrNull(fetched)) {
        setBusy(false);
        return;
      }

      // 2) Fallback: trigger per-file downloads (desktop & many mobiles)
      if (canAnchorDownload()) {
        for (const file of fetched) {
          const url = URL.createObjectURL(file);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.name;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 2000);
          // Stagger to reduce popup-blocker risk
          // eslint-disable-next-line no-await-in-loop
          await new Promise(res => setTimeout(res, delayMs));
        }
        setBusy(false);
        return;
      }

      // 3) Last resort: open each image in a new tab (iOS older Safari)
      for (const file of fetched) {
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        // eslint-disable-next-line no-await-in-loop
        await new Promise(res => setTimeout(res, delayMs));
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || 'Failed to download images.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={onDownloadAll}
        disabled={busy}
        className="px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-800 text-white font-bold shadow-lg transition text-sm disabled:opacity-60"
      >
        {busy ? 'Preparing…' : 'Download All'}
      </button>
      {err && <p className="text-red-300 text-sm">{err}</p>}
      <p className="text-white/80 text-xs">
        Mobile: uses Share if available. Otherwise downloads each image directly (no ZIP).
      </p>
    </div>
  );
}
