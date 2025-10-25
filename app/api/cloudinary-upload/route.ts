// app/api/cloudinary-upload/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from "cloudinary";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

type UploadRequest = {
  fileBase64?: string;           // data URL or raw base64
  imageUrl?: string;             // OPTIONAL: remote https URL
  profileId?: string;            // optional in body
  publicId?: string;
  folder?: string;
  extraTags?: string[] | string;
};

const DEFAULT_FOLDER = process.env.CLOUDINARY_PANEL_FOLDER || "comic-exports";

function sanitizeId(id: string) {
  return id.trim().replace(/[^\w-]/g, "_");
}
function normalizeTags(extra?: string[] | string): string[] {
  if (!extra) return [];
  if (Array.isArray(extra)) return extra.map(t => String(t).trim()).filter(Boolean);
  return String(extra).split(/[, ]+/).map(t => t.trim()).filter(Boolean);
}
const isDataUrl = (s: string) => s.startsWith("data:");
const isHttpUrl = (s: string) => /^https?:\/\//i.test(s);

export async function POST(req: Request) {
  try {
    const body: UploadRequest = await req.json();

    const cookiePid = cookies().get("profileId")?.value
      ? decodeURIComponent(cookies().get("profileId")!.value)
      : undefined;
    const rawPid = body.profileId || cookiePid;   // cookie fallback
    const safeProfile = rawPid ? sanitizeId(rawPid) : undefined;

    const { fileBase64, imageUrl, publicId, folder, extraTags } = body;

    if (!fileBase64 && !imageUrl) {
      return NextResponse.json({ ok: false, error: "fileBase64 or imageUrl is required" }, { status: 400 });
    }

    const targetFolder = (folder || DEFAULT_FOLDER).trim();
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
      ...(safeProfile ? { context: { profileId: safeProfile } } : {}),
      ...(publicId ? { public_id: publicId } : {}),
    };

    // Log once so you can verify in Vercel → Functions → Logs
    console.log("[cloudinary-upload] profileId:", safeProfile ?? "(none)", "folder:", targetFolder, "tags:", tags);

    let result: UploadApiResponse;

    if (imageUrl && isHttpUrl(imageUrl)) {
      // Direct remote URL upload
      result = await cloudinary.uploader.upload(imageUrl, options);
    } else {
      // Base64/data URL upload
      const base64 = fileBase64!;
      const buffer = Buffer.from(isDataUrl(base64) ? base64.split("base64,")[1]! : base64, "base64");
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, res) => {
          if (err) return reject(err);
          if (!res) return reject(new Error("Empty Cloudinary response"));
          resolve(res);
        });
        stream.end(buffer);
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctx = (result.context as any)?.custom ?? result.context ?? null;

    return NextResponse.json({
      ok: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      folder: targetFolder,
      tags: result.tags ?? [],
      context: ctx,
      linked_profile: safeProfile ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed (unknown error)";
    console.error("[cloudinary-upload] error:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
