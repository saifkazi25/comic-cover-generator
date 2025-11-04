// utils/panels.ts
import {
  uploadImageFromUrl,
  buildCleanPanelUploadSpec,
  buildFinalPanelUploadSpec,
} from "./cloudinary";

type SaveCleanParams = {
  profileId?: string;
  heroSlug?: string;        // optional: controls publicId prefix (defaults handled in builder)
  coverUrl?: string;        // RAW cover (no dialogue)
  panelUrls?: string[];     // RAW panels (no dialogue)
  stamp?: string;           // optional pairing token; accepted by builders (ignored at runtime)
  baseFolder?: string;      // defaults to "comic-exports"
  extraTags?: string[];     // additional tags to apply
};

type SaveFinalParams = {
  profileId?: string;
  heroSlug?: string;        // optional: controls publicId prefix
  finalCoverUrl?: string;   // captioned cover (dialogue baked)
  finalPanelUrls?: string[];// captioned panels (dialogue baked)
  stamp: string;            // REQUIRED to pair with clean if you use it in your flow
  baseFolder?: string;      // defaults to "comic-exports"
  extraTags?: string[];     // additional tags to apply
};

export async function saveCleanPanelsToCloudinary(params: SaveCleanParams) {
  const {
    profileId,
    heroSlug,
    coverUrl,
    panelUrls = [],
    stamp,
    baseFolder,
    extraTags = [],
  } = params;

  const results: { cleanCoverUrl?: string; cleanPanelUrls: string[] } = {
    cleanPanelUrls: [],
  };

  // Upload CLEAN cover (panelIndex = -1)
  if (coverUrl) {
    const spec = buildCleanPanelUploadSpec({
      heroSlug,
      profileId,
      panelIndex: -1,
      baseFolder,
      extraTags,
      stamp, // accepted but ignored by builder (for compatibility)
    });

    const uploads = await uploadImageFromUrl({
      imageUrl: coverUrl,
      publicId: spec.publicId,
      folder: spec.folder,
      tags: spec.tags,
      profileId,
      variant: "clean",
      alsoUploadClean: false,
    });

    const clean = uploads.find((u) => u.kind === "clean") ?? uploads[0];
    if (clean) results.cleanCoverUrl = clean.secure_url;
  }

  // Upload CLEAN panels (panelIndex = 0..n-1)
  for (let i = 0; i < panelUrls.length; i++) {
    const url = panelUrls[i];
    if (!url) continue;

    const spec = buildCleanPanelUploadSpec({
      heroSlug,
      profileId,
      panelIndex: i,
      baseFolder,
      extraTags,
      stamp,
    });

    const uploads = await uploadImageFromUrl({
      imageUrl: url,
      publicId: spec.publicId,
      folder: spec.folder,
      tags: spec.tags,
      profileId,
      variant: "clean",
      alsoUploadClean: false,
    });

    const clean = uploads.find((u) => u.kind === "clean") ?? uploads[0];
    if (clean?.secure_url) results.cleanPanelUrls.push(clean.secure_url);
  }

  return results;
}

/**
 * Optional: save captioned/final (dialogue-baked) variants
 * to a parallel folder with matching names.
 */
export async function saveFinalPanelsToCloudinary(params: SaveFinalParams) {
  const {
    profileId,
    heroSlug,
    finalCoverUrl,
    finalPanelUrls = [],
    stamp,
    baseFolder,
    extraTags = [],
  } = params;

  const results: { finalCoverUrl?: string; finalPanelUrls: string[] } = {
    finalPanelUrls: [],
  };

  // Upload FINAL cover (panelIndex = -1)
  if (finalCoverUrl) {
    const spec = buildFinalPanelUploadSpec({
      heroSlug,
      profileId,
      panelIndex: -1,
      baseFolder,
      extraTags,
      stamp,
    });

    const uploads = await uploadImageFromUrl({
      imageUrl: finalCoverUrl,
      publicId: spec.publicId,
      folder: spec.folder,
      tags: spec.tags,
      profileId,
      variant: "dialogue", // final/captioned
      alsoUploadClean: false,
    });

    const dialog = uploads.find((u) => u.kind === "dialogue") ?? uploads[0];
    if (dialog) results.finalCoverUrl = dialog.secure_url;
  }

  // Upload FINAL panels (panelIndex = 0..n-1)
  for (let i = 0; i < finalPanelUrls.length; i++) {
    const url = finalPanelUrls[i];
    if (!url) continue;

    const spec = buildFinalPanelUploadSpec({
      heroSlug,
      profileId,
      panelIndex: i,
      baseFolder,
      extraTags,
      stamp,
    });

    const uploads = await uploadImageFromUrl({
      imageUrl: url,
      publicId: spec.publicId,
      folder: spec.folder,
      tags: spec.tags,
      profileId,
      variant: "dialogue",
      alsoUploadClean: false,
    });

    const dialog = uploads.find((u) => u.kind === "dialogue") ?? uploads[0];
    if (dialog?.secure_url) results.finalPanelUrls.push(dialog.secure_url);
  }

  return results;
}
