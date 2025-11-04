// utils/cloudinary/index.ts

export type UploadSpec = {
  folder: string;
  publicId: string;
  tags?: string[];
};

// ---------- local helpers ----------
function sanitizeFolder(s: string): string {
  return s.replace(/[^a-zA-Z0-9/_-]+/g, '').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '');
}
function sanitizePublicId(s: string): string {
  return s.replace(/[^a-zA-Z0-9/_-]+/g, '').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '');
}

/**
 * Build the CLEAN (no dialogue) panel upload spec.
 * -> folder: "comic-exports/clean", publicId: "Hero_panel-3"
 */
export function buildCleanPanelUploadSpec(params: {
  heroSlug?: string;            // keep optional if your callers don’t always pass it
  panelIndex: number;
  profileId?: string;
  baseFolder?: string;          // default: comic-exports
  extraTags?: string[];
  stamp?: string;               // <-- accept but ignore
}): UploadSpec {
  const {
    heroSlug = 'Hero',
    panelIndex,
    profileId,
    baseFolder = 'comic-exports',
    extraTags = [],
    // stamp is intentionally unused (only for call-site convenience)
  } = params;

  const tags = ['story_panel', ...(profileId ? [`profile:${profileId}`] : []), ...extraTags];
  return {
    folder: `${sanitizeFolder(baseFolder)}/clean`,
    publicId: sanitizePublicId(`${heroSlug.replace(/\s+/g, '_')}_panel-${panelIndex}`),
    tags,
  };
}

/**
 * Build the FINAL (dialogue-baked) panel upload spec.
 * -> folder: "comic-exports/dialogue", publicId: "Hero_panel-3"
 */
export function buildFinalPanelUploadSpec(params: {
  heroSlug?: string;            // keep optional if your callers don’t always pass it
  panelIndex: number;
  profileId?: string;
  baseFolder?: string;          // default: comic-exports
  extraTags?: string[];
  stamp?: string;               // <-- accept but ignore
}): UploadSpec {
  const {
    heroSlug = 'Hero',
    panelIndex,
    profileId,
    baseFolder = 'comic-exports',
    extraTags = [],
    // stamp is intentionally unused
  } = params;

  const tags = ['story_panel', ...(profileId ? [`profile:${profileId}`] : []), ...extraTags];
  return {
    folder: `${sanitizeFolder(baseFolder)}/dialogue`,
    publicId: sanitizePublicId(`${heroSlug.replace(/\s+/g, '_')}_panel-${panelIndex}`),
    tags,
  };
}

/**
 * Upload a remote image URL via your server route.
 * If you set `alsoUploadClean: true` and provide `cleanImageUrl`, both variants are stored.
 */
export async function uploadImageFromUrl(
  imageUrlOrParams:
    | string
    | {
        imageUrl: string;
        publicId: string;
        folder?: string;
        tags?: string[];
        variant?: 'dialogue' | 'clean';
        profileId?: string;
        alsoUploadClean?: boolean;
        cleanImageUrl?: string;
      },
  publicIdMaybe?: string,
  options: {
    folder?: string;
    tags?: string[];
    variant?: 'dialogue' | 'clean';
    profileId?: string;
    alsoUploadClean?: boolean;
    cleanImageUrl?: string;
  } = {}
): Promise<
  Array<{
    kind: 'dialogue' | 'clean';
    secure_url: string;
    public_id: string;
  }>
> {
  let imageUrl: string;
  let publicId: string;
  let folder: string | undefined;
  let tags: string[] | undefined;
  let variant: 'dialogue' | 'clean' | undefined;
  let profileId: string | undefined;
  let alsoUploadClean: boolean | undefined;
  let cleanImageUrl: string | undefined;

  if (typeof imageUrlOrParams === 'string') {
    imageUrl = imageUrlOrParams;
    publicId = String(publicIdMaybe || '').trim();
    folder = options.folder;
    tags = options.tags;
    variant = options.variant;
    profileId = options.profileId;
    alsoUploadClean = options.alsoUploadClean;
    cleanImageUrl = options.cleanImageUrl;
  } else {
    imageUrl = imageUrlOrParams.imageUrl;
    publicId = imageUrlOrParams.publicId;
    folder = imageUrlOrParams.folder;
    tags = imageUrlOrParams.tags;
    variant = imageUrlOrParams.variant;
    profileId = imageUrlOrParams.profileId;
    alsoUploadClean = imageUrlOrParams.alsoUploadClean;
    cleanImageUrl = imageUrlOrParams.cleanImageUrl;
  }

  if (!imageUrl || !publicId) {
    throw new Error('uploadImageFromUrl: imageUrl and publicId are required');
  }

  const res = await fetch('/api/cloudinary-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      publicId: sanitizePublicId(publicId),
      folder: folder ? sanitizeFolder(folder) : 'comic-exports',
      variant: variant ?? 'dialogue',
      alsoUploadClean: !!alsoUploadClean,
      fileBase64: imageUrl,       // Cloudinary accepts remote URL in "file"
      cleanBase64: cleanImageUrl, // optional remote URL for clean variant
      extraTags: tags ?? [],
    }),
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => '');
    throw new Error(`uploadImageFromUrl failed: ${res.status} ${errTxt}`);
  }

  const json = (await res.json()) as {
    ok: boolean;
    uploads: Array<{ kind: 'dialogue' | 'clean'; secure_url: string; public_id: string }>;
  };
  if (!json.ok) throw new Error('uploadImageFromUrl: route responded with ok=false');
  return json.uploads || [];
}

/**
 * Upload only a CLEAN variant to "comic-exports/clean".
 */
export async function uploadCleanVariant(
  imageUrlOrParams:
    | string
    | {
        imageUrl: string;
        publicId: string;
        profileId?: string;
        tags?: string[];
        folder?: string;
      },
  publicIdMaybe?: string,
  opts: { profileId?: string; tags?: string[]; folder?: string } = {}
): Promise<{ secure_url: string; public_id: string }> {
  let imageUrl: string;
  let publicId: string;
  let profileId: string | undefined;
  let tags: string[] | undefined;
  let folder: string | undefined;

  if (typeof imageUrlOrParams === 'string') {
    imageUrl = imageUrlOrParams;
    publicId = String(publicIdMaybe || '').trim();
    profileId = opts.profileId;
    tags = opts.tags;
    folder = opts.folder ?? 'comic-exports';
  } else {
    imageUrl = imageUrlOrParams.imageUrl;
    publicId = imageUrlOrParams.publicId;
    profileId = imageUrlOrParams.profileId;
    tags = imageUrlOrParams.tags;
    folder = imageUrlOrParams.folder ?? 'comic-exports';
  }

  const uploads = await uploadImageFromUrl({
    imageUrl,
    publicId: sanitizePublicId(publicId),
    folder: `${sanitizeFolder(folder)}/clean`,
    tags,
    profileId,
    variant: 'clean',
    alsoUploadClean: false,
  });

  const clean = uploads.find(u => u.kind === 'clean') || uploads[0];
  if (!clean) throw new Error('uploadCleanVariant: no upload result');
  return { secure_url: clean.secure_url, public_id: clean.public_id };
}
