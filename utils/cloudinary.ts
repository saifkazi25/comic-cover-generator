// utils/cloudinary.ts
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function isCloudinaryUrl(url: string): boolean {
  return /(^https?:\/\/)?res\.cloudinary\.com\//i.test(url);
}

function sanitizeId(id: string) {
  // allow letters, numbers, underscore, dash
  return id.trim().replace(/[^\w-]/g, "_");
}

function normalizeTags(extra?: string[] | string): string[] {
  if (!extra) return [];
  if (Array.isArray(extra)) return extra.map(t => String(t).trim()).filter(Boolean);
  return String(extra)
    .split(/[, ]+/)
    .map(t => t.trim())
    .filter(Boolean);
}

export type UploadKind = "cover" | "panel";

type UploadOptions = {
  type?: UploadKind;           // default: 'cover'
  profileId?: string;          // will be stored to tags + context if provided
  folderOverride?: string;     // optional folder override
  extraTags?: string[] | string;
  publicId?: string;           // optional explicit public_id
};

/**
 * Upload a remote image URL to Cloudinary with profile tagging.
 * - Skips if the URL is already a Cloudinary URL.
 * - Adds tags: comic_panel/comic_cover, profile:<id>, profile_<id>, plus extraTags.
 * - Adds context: { profileId: <id> }
 * - Returns the secure_url
 */
export async function uploadImageFromUrl(
  imageUrl: string,
  opts: UploadOptions = {}
): Promise<string> {
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

    const folder =
      folderOverride ||
      (type === "cover" ? "comic-covers" : "comic-panels");

    // build a unique, descriptive public_id if not supplied
    const urlParts = imageUrl.split("/");
    const fileNameGuess = urlParts[urlParts.length - 1]
      .split("?")[0]
      .replace(/\.[^/.]+$/, "");
    const timestamp = Date.now();
    const derivedPublicId = publicId || `${fileNameGuess}_${timestamp}`;

    const safeProfile = profileId ? sanitizeId(profileId) : undefined;

    const tags: string[] = [
      type === "cover" ? "comic_cover" : "comic_panel",
      ...normalizeTags(extraTags),
      ...(safeProfile ? [`profile:${safeProfile}`, `profile_${safeProfile}`] : []),
    ];

    const result = await cloudinary.v2.uploader.upload(imageUrl, {
      folder,
      public_id: derivedPublicId,
      use_filename: false,
      unique_filename: true,
      overwrite: false,
      tags,
      ...(safeProfile ? { context: { profileId: safeProfile } } : {}),
      resource_type: "image",
    });

    console.log(
      `[Cloudinary] Uploaded ${type} image`,
      { url: result.secure_url, folder, public_id: result.public_id, tags: result.tags }
    );

    return result.secure_url;
  } catch (error) {
    console.error(`[Cloudinary] ❌ Upload failed for image: ${imageUrl}`);
    console.error(error);
    throw new Error("Failed to upload image to Cloudinary.");
  }
}
