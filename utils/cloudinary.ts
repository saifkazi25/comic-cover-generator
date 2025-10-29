// utils/cloudinary.ts
import { v2 as cloudinary, UploadApiResponse, UploadApiOptions } from "cloudinary";

/**
 * ENV + Config
 * - CLOUDINARY_ROOT_FOLDER: optional, defaults to 'heroapp'
 * - PROFILE_TAG: optional, defaults to 'profile'
 */
const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_ROOT_FOLDER = "heroapp",
  PROFILE_TAG = "profile",
} = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  throw new Error(
    "[Cloudinary] Missing env vars. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are set (Vercel → Project Settings → Environment Variables)."
  );
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

function isCloudinaryUrl(url: string): boolean {
  // Covers typical delivery domains:
  // - https://res.cloudinary.com/<cloud_name>/image/upload/...
  // - https://<cloud_name>.cloudinary.com/...
  return /(^https?:\/\/)?((res|images)\.cloudinary\.com|[a-z0-9-]+\.cloudinary\.com)\//i.test(url);
}

function sanitizeId(id: string) {
  // allow letters, numbers, underscore, dash (no slashes/spaces)
  return id.trim().replace(/[^\w-]/g, "_");
}

function normalizeTags(extra?: string[] | string): string[] {
  if (!extra) return [];
  if (Array.isArray(extra)) return extra.map((t) => String(t).trim()).filter(Boolean);
  return String(extra)
    .split(/[, ]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function isoStamp(): string {
  // 20251029T093015 from ISO8601
  return new Date().toISOString().replace(/[:-]/g, "").replace(/\..+$/, "");
}

export type UploadKind = "cover" | "panel";

type UploadOptions = {
  type?: UploadKind; // default: 'cover'
  profileId?: string; // stored in tags + context if provided
  folderOverride?: string; // optional explicit folder (if not using defaults)
  extraTags?: string[] | string;
  publicId?: string; // optional explicit public_id
  // When not overridden, folder defaults to:
  //   heroapp/{profileId}/comic-covers   for type='cover'
  //   heroapp/{profileId}/comic-panels   for type='panel'
};

/**
 * Derive a default folder when none is provided.
 * Keeps things tidy per profile and content type.
 */
function deriveFolder(type: UploadKind, profileId?: string, folderOverride?: string): string {
  if (folderOverride) return folderOverride;

  const safeProfile = profileId ? sanitizeId(profileId) : "unassigned";
  if (type === "panel") return `${CLOUDINARY_ROOT_FOLDER}/${safeProfile}/comic-panels`;
  return `${CLOUDINARY_ROOT_FOLDER}/${safeProfile}/comic-covers`;
}

function derivePublicId(imageUrl: string, provided?: string): string {
  if (provided) return sanitizeId(provided);
  const urlParts = imageUrl.split("/");
  const fileNameGuess = urlParts[urlParts.length - 1].split("?")[0].replace(/\.[^/.]+$/, "");
  return `${sanitizeId(fileNameGuess)}_${isoStamp()}`;
}

/**
 * Upload a remote image URL to Cloudinary with profile tagging.
 * - Skips upload if the URL is already a Cloudinary URL (returns input URL).
 * - Adds tags:
 *     - comic_panel / comic_cover
 *     - PROFILE_TAG (e.g., "profile")
 *     - profile:<id>  (fast selector)
 *     - profile_<id>  (legacy/compat)
 *     - plus any extraTags
 * - Adds context: { profileId }
 * - Returns the secure_url (string)
 */
export async function uploadImageFromUrl(imageUrl: string, opts: UploadOptions = {}): Promise<string> {
  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("[Cloudinary] uploadImageFromUrl: imageUrl is required");
  }

  try {
    if (isCloudinaryUrl(imageUrl)) {
      console.log(`[Cloudinary] Input is already a Cloudinary URL, skipping upload: ${imageUrl}`);
      return imageUrl;
    }

    const {
      type = "cover",
      profileId,
      folderOverride,
      extraTags,
      publicId,
    } = opts;

    const folder = deriveFolder(type, profileId, folderOverride);
    const derivedPublicId = derivePublicId(imageUrl, publicId);
    const safeProfile = profileId ? sanitizeId(profileId) : undefined;

    const tags: string[] = [
      type === "cover" ? "comic_cover" : "comic_panel",
      ...normalizeTags(extraTags),
      ...(safeProfile ? [PROFILE_TAG, `profile:${safeProfile}`, `profile_${safeProfile}`] : []),
    ];

    const uploadOptions: UploadApiOptions = {
      folder,
      public_id: derivedPublicId,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      tags: tags.length ? tags : undefined,
      ...(safeProfile ? { context: { profileId: safeProfile } } : {}),
      resource_type: "image",
    };

    const result: UploadApiResponse = await cloudinary.uploader.upload(imageUrl, uploadOptions);

    console.log("[Cloudinary] Uploaded image", {
      type,
      url: result.secure_url,
      folder,
      public_id: result.public_id,
      tags: result.tags,
    });

    return result.secure_url;
  } catch (error) {
    console.error(`[Cloudinary] ❌ Upload failed for image: ${imageUrl}`);
    console.error(error);
    throw new Error("Failed to upload image to Cloudinary.");
  }
}

/* ---------- Optional helpers you can use now or later ---------- */

/**
 * Save a caption-free (clean) panel/cover copy in a dedicated "clean" subfolder,
 * keeping the same naming scheme and profile tagging for easy retrieval.
 * Usage: call this RIGHT AFTER Replicate returns an image, BEFORE captions/overlays.
 */
export async function uploadCleanVariant(imageUrl: string, opts: Omit<UploadOptions, "folderOverride"> = {}): Promise<string> {
  const { type = "cover", profileId } = opts;
  const base = deriveFolder(type, profileId, undefined); // heroapp/{profile}/comic-...
  const cleanFolder = `${base.replace(/\/(comic-(covers|panels))$/, "")}/${type === "panel" ? "panels/clean" : "covers/clean"}`;
  return uploadImageFromUrl(imageUrl, { ...opts, folderOverride: cleanFolder });
}

/**
 * Save a final (captioned) panel/cover copy in a parallel "final" subfolder.
 * Call this AFTER your caption/overlay step renders a final asset URL.
 */
export async function uploadFinalVariant(imageUrl: string, opts: Omit<UploadOptions, "folderOverride"> = {}): Promise<string> {
  const { type = "cover", profileId } = opts;
  const base = deriveFolder(type, profileId, undefined);
  const finalFolder = `${base.replace(/\/(comic-(covers|panels))$/, "")}/${type === "panel" ? "panels/final" : "covers/final"}`;
  return uploadImageFromUrl(imageUrl, { ...opts, folderOverride: finalFolder });
}
