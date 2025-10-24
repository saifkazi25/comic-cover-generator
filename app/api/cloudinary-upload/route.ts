// app/api/cloudinary-upload/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from "cloudinary";

export const runtime = "nodejs";

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_PANEL_FOLDER,
} = process.env;

const DEFAULT_FOLDER = CLOUDINARY_PANEL_FOLDER || "comic-exports";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME!,
  api_key: CLOUDINARY_API_KEY!,
  api_secret: CLOUDINARY_API_SECRET!,
});

type UploadRequest = {
  fileBase64?: string;          // base64 string (dataURL or raw base64)
  profileId?: string;           // the linked profile id
  publicId?: string;            // optional custom public_id
  folder?: string;              // optional folder override
  extraTags?: string[] | string; // optional tags (array OR comma string)
};

function normalizeTags(extra: UploadRequest["extraTags"]): string[] {
  if (!extra) return [];
  if (Array.isArray(extra)) return extra.map(t => String(t).trim()).filter(Boolean);
  // comma or space separated strings
  return String(extra)
    .split(/[, ]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

// allow letters, numbers, dash, underscore; strip other chars for safe tag/context
function sanitizeId(id: string) {
  return id.trim().replace(/[^\w-]/g, "_");
}

export async function POST(req: Request) {
  try {
    const body: UploadRequest = await req.json();
    const { fileBase64, profileId, publicId, folder, extraTags } = body;

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return NextResponse.json({ ok: false, error: "fileBase64 is required" }, { status: 400 });
    }

    const targetFolder = (folder || DEFAULT_FOLDER).trim();
    const hasDataUrl = fileBase64.startsWith("data:");
    const base64Payload = hasDataUrl ? fileBase64.split("base64,")[1] : fileBase64;
    const buffer = Buffer.from(base64Payload!, "base64");

    const safeProfile = profileId ? sanitizeId(profileId) : undefined;

    // Build tags:
    // - "profile:<id>" (nice human-readable filter)
    // - "profile_<id>" (super safe variant if colon ever causes issues)
    // - any caller-provided tags
    const tags: string[] = [
      "comic_panel",
      ...normalizeTags(extraTags),
      ...(safeProfile ? [`profile:${safeProfile}`, `profile_${safeProfile}`] : []),
    ];

    const options: UploadApiOptions = {
      resource_type: "image",
      folder: targetFolder,
      overwrite: true,
      tags,
      // store a canonical key/value for precise searches
      ...(safeProfile ? { context: { profileId: safeProfile } } : {}),
      ...(publicId ? { public_id: publicId } : {}),
    };

    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (err, res) => {
        if (err) return reject(err);
        if (!res) return reject(new Error("Empty Cloudinary response"));
        resolve(res);
      });
      stream.end(buffer);
    });

    // Cloudinary returns custom context under result.context.custom (for signed uploads)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (result.context as any)?.custom ?? result.context ?? null;

    return NextResponse.json({
      ok: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      created_at: result.created_at,
      width: result.width,
      height: result.height,
      format: result.format,
      folder: targetFolder,
      tags: result.tags ?? [],
      context: ctx,
      // convenience echo for the caller
      linked_profile: safeProfile ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed (unknown error)";
    console.error("[cloudinary-upload] error:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
