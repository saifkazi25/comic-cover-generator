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
  // Primary (captioned) payload
  fileBase64?: string;                 // data URL or raw base64
  imageUrl?: string;                   // HTTPS URL

  // Clean (no captions) payload for dual upload
  cleanBase64?: string;
  cleanImageUrl?: string;

  // Identity / placement
  profileId?: string;                  // optional (cookie fallback)
  publicId?: string;
  folder?: string;                     // base folder (default: comic-exports)

  // Behavior
  extraTags?: string[] | string;       // additional tags
  variant?: "dialogue" | "clean";      // single-variant upload target
  alsoUploadClean?: boolean;           // if true, also uploads clean copy (when provided)
};

const DEFAULT_FOLDER = process.env.CLOUDINARY_PANEL_FOLDER || "comic-exports";

const isHttp = (s?: string) => !!s && /^https?:\/\//i.test(s);
const isData = (s?: string) => !!s && s.startsWith("data:");
const sanitizeId = (id: string) => id.trim().replace(/[^\w-]/g, "_");
const normTag = (t: string) => String(t).trim().replace(/[^\w-]/g, "_");
function normalizeTags(extra?: string[] | string): string[] {
  if (!extra) return [];
  if (Array.isArray(extra)) return extra.map(normTag).filter(Boolean);
  return String(extra).split(/[, ]+/).map(normTag).filter(Boolean);
}

async function uploadFromSource(
  src: { fileBase64?: string; imageUrl?: string },
  options: UploadApiOptions
): Promise<UploadApiResponse> {
  const { fileBase64, imageUrl } = src;

  if (isHttp(imageUrl)) {
    return cloudinary.uploader.upload(imageUrl!, options);
  }

  if (!fileBase64) throw new Error("Missing fileBase64 for upload");
  const payload = isData(fileBase64) ? fileBase64.split("base64,")[1]! : fileBase64;
  const buf = Buffer.from(payload, "base64");

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, res) => {
      if (err) return reject(err);
      if (!res) return reject(new Error("Empty Cloudinary response"));
      resolve(res);
    });
    stream.end(buf);
  });
}

export async function POST(req: Request) {
  try {
    const body: UploadRequest = await req.json();

    // cookies() is synchronous in Next.js route handlers
    const cookieStore = cookies();
    const cookiePid = cookieStore.get("profileId")?.value;
    const rawPid = body.profileId ?? (cookiePid ? decodeURIComponent(cookiePid) : "");
    const safeProfile = rawPid ? sanitizeId(rawPid) : undefined;

    const {
      fileBase64,
      imageUrl,
      cleanBase64,
      cleanImageUrl,
      publicId,
      folder,
      extraTags,
      variant,
      alsoUploadClean,
    } = body;

    // Need at least a primary source
    if (!fileBase64 && !imageUrl) {
      return NextResponse.json({ ok: false, error: "fileBase64 or imageUrl is required" }, { status: 400 });
    }

    const baseFolder = (folder || DEFAULT_FOLDER).trim();

    const baseTags: string[] = [
      "comic_panel",
      ...normalizeTags(extraTags),
      ...(safeProfile ? [`profile:${safeProfile}`, `profile_${safeProfile}`] : []),
    ];

    const makeOptions = (subfolder: string, addTags: string[] = []): UploadApiOptions => ({
      resource_type: "image",
      folder: subfolder,
      overwrite: true,
      tags: [...baseTags, ...addTags],
      ...(safeProfile ? { context: { profileId: safeProfile } } : {}),
      ...(publicId ? { public_id: publicId } : {}),
    });

    const uploads: Array<{ kind: "dialogue" | "clean"; res: UploadApiResponse }> = [];

    // --- Primary upload (defaults to "dialogue" unless explicitly "clean") ---
    const primaryKind: "dialogue" | "clean" = variant === "clean" ? "clean" : "dialogue";
    const primaryFolder = `${baseFolder}/${primaryKind}`;
    const primaryTags = primaryKind === "clean" ? ["comic_no_captions"] : [];
    const primaryOpts = makeOptions(primaryFolder, primaryTags);

    const primarySrc =
      primaryKind === "clean"
        ? { fileBase64: cleanBase64, imageUrl: cleanImageUrl }
        : { fileBase64, imageUrl };

    // guard: if variant=clean but you didn't send clean*, fall back to primary file
    const safePrimarySrc =
      primaryKind === "clean" && !primarySrc.fileBase64 && !primarySrc.imageUrl
        ? { fileBase64, imageUrl }
        : primarySrc;

    console.log("[cloudinary-upload] UPLOAD primary", {
      kind: primaryKind,
      folder: primaryFolder,
      publicId: publicId ?? "(auto)",
      profileId: safeProfile ?? "(none)",
      tags: primaryOpts.tags,
    });

    const first = await uploadFromSource(safePrimarySrc, primaryOpts);
    uploads.push({ kind: primaryKind, res: first });

    // --- Optional second upload: clean variant (for Luma) ---
    if (alsoUploadClean && primaryKind !== "clean" && (cleanBase64 || cleanImageUrl)) {
      const cleanFolder = `${baseFolder}/clean`;
      const cleanOpts = makeOptions(cleanFolder, ["comic_no_captions"]);

      console.log("[cloudinary-upload] UPLOAD secondary", {
        kind: "clean",
        folder: cleanFolder,
        publicId: publicId ?? "(auto)",
        profileId: safeProfile ?? "(none)",
        tags: cleanOpts.tags,
      });

      const second = await uploadFromSource({ fileBase64: cleanBase64, imageUrl: cleanImageUrl }, cleanOpts);
      uploads.push({ kind: "clean", res: second });
    }

    return NextResponse.json({
      ok: true,
      linked_profile: safeProfile ?? null,
      uploads: uploads.map(({ kind, res }) => ({
        kind,
        secure_url: res.secure_url,
        public_id: res.public_id,
        folder: res.folder ?? (res.public_id?.split("/").slice(0, -1).join("/") || null),
        tags: res.tags ?? [],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        context: (res.context as any)?.custom ?? res.context ?? null,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed (unknown error)";
    console.error("[cloudinary-upload] error:", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
