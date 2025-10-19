// app/api/cloudinary-upload/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

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

export async function POST(req: Request) {
  try {
    const { fileBase64, profileId, publicId, folder, extraTags } = await req.json();

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return NextResponse.json({ ok: false, error: "fileBase64 is required" }, { status: 400 });
    }

    // Build options: folder + metadata
    const opts: any = {
      resource_type: "image",
      folder: (folder || DEFAULT_FOLDER).trim(),
      overwrite: true,
      // context must be an object for signed uploads
      ...(profileId ? { context: { profileId } } : {}),
      // tags is an array; we'll add profile tag only if profileId provided
      tags: [
        "comic_panel",
        ...(Array.isArray(extraTags) ? extraTags : []),
        ...(profileId ? [`profile:${profileId}`] : []),
      ],
    };
    if (publicId) opts.public_id = publicId;

    // Accept data URLs *or* raw base64
    const isDataUrl = fileBase64.startsWith("data:");
    const buffer = isDataUrl
      ? Buffer.from(fileBase64.split("base64,")[1], "base64")
      : Buffer.from(fileBase64, "base64");

    const result = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(opts, (err, res) => {
        if (err) return reject(err);
        resolve(res);
      });
      stream.end(buffer);
    });

    return NextResponse.json({
      ok: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      created_at: result.created_at,
      tags: result.tags ?? [],
      context: result.context?.custom ?? result.context ?? null,
      folder: opts.folder,
    });
  } catch (e: any) {
    console.error("[cloudinary-upload] error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Upload failed" }, { status: 500 });
  }
}
