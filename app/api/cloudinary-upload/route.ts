// app/api/cloudinary-upload/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// If you prefer Edge, you can switch to 'edge' but keep in mind some libs aren’t edge-safe.
export const runtime = 'nodejs';

// ----- ENV -----
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
// Optional unsigned preset if you want to allow that mode
const UNSIGNED_PRESET = process.env.CLOUDINARY_UNSIGNED_PRESET || '';

if (!CLOUD_NAME) {
  console.warn('[cloudinary-upload] CLOUDINARY_CLOUD_NAME is not set');
}
if (!API_KEY || !API_SECRET) {
  console.warn('[cloudinary-upload] API credentials missing; will fall back to unsigned if preset provided');
}

// ----- UTILS -----
function sanitizeId(s: string): string {
  // allow alnum, dash, underscore, slash (folder), and dot for extensions if present
  return s.replace(/[^a-zA-Z0-9/_-]+/g, '').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '');
}
function bool(v: unknown) {
  return v === true || v === 'true' || v === 1 || v === '1';
}

function signParams(params: Record<string, string | number | undefined>): { signature: string; timestamp: number } {
  const timestamp = Math.floor(Date.now() / 1000);
  const filtered: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === '') continue;
    filtered[k] = v as string | number;
  }
  // Cloudinary signature: sort keys asc, join as key=value&..., append API_SECRET
  const toSign = Object.keys(filtered)
    .sort()
    .map((k) => `${k}=${filtered[k]}`)
    .join('&') + API_SECRET;

  const signature = crypto.createHash('sha1').update(toSign).digest('hex');
  return { signature, timestamp };
}

async function uploadBase64({
  fileBase64,
  publicId,
  folder,
  tags,
}: {
  fileBase64: string;
  publicId: string;
  folder: string;
  tags?: string[];
}) {
  // Prefer signed upload on server; fallback to unsigned if configured
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

  const baseParams: Record<string, string | number | undefined> = {
    public_id: publicId,
    folder,
    tags: (tags ?? []).join(','),
    timestamp: undefined, // set during sign
  };

  let body: URLSearchParams;

  if (API_KEY && API_SECRET) {
    const { signature, timestamp } = signParams({
      ...baseParams,
      // Cloudinary requires timestamp to be part of the signature
      timestamp: Math.floor(Date.now() / 1000),
    });

    body = new URLSearchParams({
      file: fileBase64,
      public_id: publicId,
      folder,
      tags: (tags ?? []).join(','),
      api_key: API_KEY,
      timestamp: String(timestamp),
      signature,
    });
  } else if (UNSIGNED_PRESET) {
    body = new URLSearchParams({
      file: fileBase64,
      upload_preset: UNSIGNED_PRESET,
      public_id: publicId,
      folder,
      tags: (tags ?? []).join(','),
    });
  } else {
    throw new Error('Cloudinary not configured: need API credentials or an unsigned preset.');
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed: ${res.status} ${errTxt}`);
  }

  const json = await res.json();
  return {
    secure_url: String(json.secure_url || ''),
    public_id: String(json.public_id || publicId),
  };
}

// ----- ROUTE -----
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ✅ FIX 1: cookies() is async — await it
    const cookieStore = await cookies();
    const cookiePid = cookieStore.get('profileId')?.value;

    // ✅ FIX 2: proper nullish-coalescing (no `??:` typo)
    const rawPid: string =
      (typeof body.profileId === 'string' ? body.profileId : undefined) ??
      (cookiePid ? decodeURIComponent(cookiePid) : '') ??
      '';

    const safeProfile = rawPid ? sanitizeId(rawPid) : undefined;

    const {
      publicId,
      folder = 'comic-exports',
      variant = 'dialogue',
      alsoUploadClean = false,
      fileBase64,
      cleanBase64,
      extraTags = [],
    }: {
      publicId: string;
      folder?: string;
      variant?: 'dialogue' | 'clean';
      alsoUploadClean?: boolean;
      fileBase64: string; // dialogue-baked
      cleanBase64?: string; // raw/no-overlay
      extraTags?: string[];
    } = body || {};

    if (!publicId || !fileBase64) {
      return NextResponse.json({ ok: false, error: 'Missing publicId or fileBase64' }, { status: 400 });
    }

    const baseFolder = sanitizeId(folder || 'comic-exports');
    const baseId = sanitizeId(publicId);

    // place into /dialogue and /clean subfolders as the UI expects
    const dialogueFolder = `${baseFolder}/dialogue`;
    const cleanFolder = `${baseFolder}/clean`;

    const tags = [
      'story_panel',
      ...(safeProfile ? [`profile:${safeProfile}`] : []),
      ...extraTags.filter((t: string) => !!t),
    ];

    const uploads: Array<{ kind: 'dialogue' | 'clean'; secure_url: string; public_id: string }> = [];

    // 1) Dialogue (primary)
    if (variant === 'dialogue') {
      const up = await uploadBase64({
        fileBase64,
        publicId: baseId,
        folder: dialogueFolder,
        tags,
      });
      uploads.push({ kind: 'dialogue', ...up });
    }

    // 2) Clean (optional or when variant === 'clean')
    if (alsoUploadClean || variant === 'clean') {
      if (!cleanBase64) {
        // If caller forgot to pass cleanBase64, fall back to the same file to avoid failing the pipeline.
        // You can change this to hard-fail with 400 if you prefer.
        console.warn('[cloudinary-upload] cleanBase64 missing; using fileBase64 as fallback');
      }
      const up = await uploadBase64({
        fileBase64: cleanBase64 || fileBase64,
        publicId: baseId,
        folder: cleanFolder,
        tags,
      });
      uploads.push({ kind: 'clean', ...up });
    }

    return NextResponse.json({ ok: true, uploads });
  } catch (err: any) {
    console.error('[cloudinary-upload] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message || 'Upload failed' },
      { status: 500 },
    );
  }
}
