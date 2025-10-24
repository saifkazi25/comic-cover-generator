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
  fileBase64?: string;
  profileId?: string;
  publicId?: string;
  folder?: string;
  extraTags?: string[] | string;
};

export async function POST(req: Request) {
  try {
    const body: UploadRequest = await req.json();

    const { fileBase64, profileId, publicId, folder, extraTags } = body;

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return NextResponse.json(
        { ok: false, error: "fileBase64 is required" },
        { status: 400 },
      );
    }

    // ---------- Build upload options ----------
    const targetFolder = (folder || DEFAULT_FOLDER).trim();
    const safeProfile = profileId ? profileId.replace(/[:\s]+/g, "_") : undefined;

    const tags: string[] = [
      "comic_panel",
      ...(Array.isArray(extraTags) ? extraTags : []),
      ...(safeProfile ? [`profile_${safeProfile}`] : []),
    ];

    const options: UploadApiOptions = {
      resource_type: "image",
      folder: targetFolder,
      overwrite: true,
      tags,
      ...(safeProfile ? { context: { profile: safeProfile } } : {}),
      ...(publicId ? { public_id: publicId } : {}),
    };

    // ---------- Prepare buffer ----------
    const isDataUrl = fileBase64.startsWith("data:");
    const buffer = isDataUrl
      ? Buffer.from(fileBase64.split("base64,")[1]!, "base64")
      : Buffer.from(fileBase64, "base64");

    // ---------- Upload ----------
    const result: UploadApiResponse = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (err, res?: UploadApiResponse) => {
          if (err) return reject(err);
          if (!res) return reject(new Error("Empty Cloudinary response"));
          resolve(res);
        },
      );
      stream.end(buffer);
    });

    // ---------- Response ----------
    return NextResponse.json({
      ok: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
      created_at: result.created_at,
      tags: result.tags ?? [],
      context:
        // Signed uploads place custom data under context.custom
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (result.context as any)?.custom ?? result.context ?? null,
      folder: targetFolder,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Upload failed (unknown error)";
    console.error("[cloudinary-upload] error:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
