// utils/panels.ts
import { uploadImageFromUrl, buildCleanPanelUploadSpec, buildFinalPanelUploadSpec } from "./cloudinary";

export async function saveCleanPanelsToCloudinary(params: {
  profileId: string;
  coverUrl?: string;        // Replicate cover (no captions)
  panelUrls?: string[];     // Replicate panels (no captions)
  stamp?: string;           // pass once so clean/final line up
}) {
  const { profileId, coverUrl, panelUrls = [], stamp } = params;
  const results: { cleanCoverUrl?: string; cleanPanelUrls: string[] } = { cleanPanelUrls: [] };

  if (coverUrl) {
    const spec = buildCleanPanelUploadSpec({ profileId, panelIndex: -1, stamp });
    const up = await uploadImageFromUrl(coverUrl, {
      folder: spec.folder,
      publicId: spec.publicId,
      tags: spec.tags,
      context: spec.context,
    });
    results.cleanCoverUrl = up.secure_url;
  }

  for (let i = 0; i < panelUrls.length; i++) {
    const url = panelUrls[i];
    const spec = buildCleanPanelUploadSpec({ profileId, panelIndex: i, stamp });
    const up = await uploadImageFromUrl(url, {
      folder: spec.folder,
      publicId: spec.publicId,
      tags: spec.tags,
      context: spec.context,
    });
    results.cleanPanelUrls.push(up.secure_url);
  }

  return results;
}

/** Optional: save captioned/final variants to a parallel folder with matching stamp */
export async function saveFinalPanelsToCloudinary(params: {
  profileId: string;
  finalCoverUrl?: string;   // your captioned cover URL (data URL or temp public URL)
  finalPanelUrls?: string[];
  stamp: string;            // REQUIRED: reuse the same stamp to pair with clean
}) {
  const { profileId, finalCoverUrl, finalPanelUrls = [], stamp } = params;
  const results: { finalCoverUrl?: string; finalPanelUrls: string[] } = { finalPanelUrls: [] };

  if (finalCoverUrl) {
    const spec = buildFinalPanelUploadSpec({ profileId, panelIndex: -1, stamp });
    const up = await uploadImageFromUrl(finalCoverUrl, {
      folder: spec.folder,
      publicId: spec.publicId,
      tags: spec.tags,
      context: spec.context,
    });
    results.finalCoverUrl = up.secure_url;
  }

  for (let i = 0; i < finalPanelUrls.length; i++) {
    const url = finalPanelUrls[i];
    const spec = buildFinalPanelUploadSpec({ profileId, panelIndex: i, stamp });
    const up = await uploadImageFromUrl(url, {
      folder: spec.folder,
      publicId: spec.publicId,
      tags: spec.tags,
      context: spec.context,
    });
    results.finalPanelUrls.push(up.secure_url);
  }

  return results;
}
