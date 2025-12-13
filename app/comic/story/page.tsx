'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ComicPanel from '../../../components/ComicPanel';
import DownloadAllNoZip from '../../../components/DownloadAllNoZip';

interface ComicRequest {
  gender: string;
  superpower: string;
  city: string;
  fear: string;
  fuel: string;
  strength: string;
  lesson: string;
  selfieUrl: string;
  superheroName?: string;
}

interface DialogueLine {
  text: string;
  speaker: string;
}

type PanelStatus = 'idle' | 'generating' | 'done' | 'failed';

interface Panel {
  id: number;
  prompt?: string;
  imageUrl?: string; // RAW image (from /api/generate-multi)
  dialogue?: DialogueLine[]; // overlay content (client renders)
  status?: PanelStatus;
  error?: string;
}

/* ===================== Utilities & naming ===================== */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function tc(s: string) {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

/** Scary rival name inspired by user input (strips a/an/the; deterministic) */
function autoRivalNameFromFear(fearRaw: string) {
  const raw = (fearRaw || '').trim();
  const fear = raw.toLowerCase();

  if (!fear) return 'The Nemesis';

  // Curated fast-paths
  if (/(height|vertigo|fall)/.test(fear)) return 'Lord Vertigo';
  if (/(failure|not good enough|waste|potential|loser)/.test(fear)) return 'The Dreadwraith';
  if (/(rejection|abandon|alone|lonely)/.test(fear)) return 'Echo Null';
  if (/(dark|night)/.test(fear)) return 'Nightveil';
  if (/(spider|insect|bug)/.test(fear)) return 'Iron Widow';
  if (/(snake|serpent)/.test(fear)) return 'Neon Seraphis';
  if (/(public speaking|stage|crowd)/.test(fear)) return 'Many-Mouth';
  if (/(death|mortality)/.test(fear)) return 'King Thanix';
  if (/dementor/.test(fear)) return 'The Dreadmonger';

  // Clean, strip leading articles
  const cleaned = raw
    .replace(/my\s+/i, '')
    .replace(/[^a-zA-Z0-9\s\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const base = cleaned.replace(/^(a|an|the)\s+/i, '').trim();
  if (!base) return 'The Nemesis';

  const strongNouns =
    /(creature|beast|demon|wraith|phantom|reaper|fiend|spirit|guardian|monster|witch|warlock|shadow|specter|serpent|spider|ghost|golem|titan|colossus|kraken|dragon)/i;
  const epithets = ['Dread', 'Night', 'Shadow', 'Void', 'Grave', 'Hex', 'Ash', 'Iron', 'Storm', 'Nether', 'Bone', 'Blood', 'Frost', 'Ember'];
  const suffixes = ['Wraith', 'Monger', 'Reaver', 'Shade', 'Maul', 'Bane', 'Ruin', 'Scourge', 'Tyrant'];
  const h = hashStr(base);
  const pick = (arr: string[]) => arr[h % arr.length];

  if (/\s/.test(base)) {
    const e = pick(epithets);
    const alreadyHas = new RegExp(`\\b${e}\\b`, 'i').test(base);
    const named = `The ${alreadyHas ? '' : e + ' '}${tc(base)}`.replace(/\s+/g, ' ').trim();
    return named;
  }

  if (strongNouns.test(base)) {
    const e = pick(epithets);
    return `The ${e} ${tc(base)}`.replace(/\s+/g, ' ').trim();
  } else {
    const sfx = pick(suffixes);
    return `The ${tc(base)} ${sfx}`.replace(/\s+/g, ' ').trim();
  }
}

/** Persist a gender-neutral companion name */
function getOrSetCompanionName(): string {
  if (typeof window === 'undefined') return 'Alex';
  const existing = localStorage.getItem('companionName');
  if (existing) return existing;
  const pool = [
    'Alex',
    'Sam',
    'Jordan',
    'Casey',
    'Taylor',
    'Morgan',
    'Riley',
    'Jamie',
    'Avery',
    'Cameron',
    'Quinn',
    'Rowan',
    'Skyler',
    'Elliot',
    'Harper',
    'Reese',
    'Drew',
    'Sage',
    'Parker',
    'Blair',
  ];
  const pick = pool[Math.floor(Math.random() * Math.random() * pool.length) % pool.length] || 'Alex';
  localStorage.setItem('companionName', pick);
  return pick;
}

/** Lightly normalize free-text for prompts (avoid quoting user verbatim) */
function normalizeConceptForPrompt(text: string): string {
  const t = (text || '').replace(/["'“”‘’]/g, '').trim();
  return t.replace(/[^a-zA-Z0-9,\-\s]/g, '').replace(/\s+/g, ' ');
}

/* ===== Paraphrase helpers (captions) ===== */
function trainingCaption(superpower: string): string {
  const p = (superpower || '').trim();
  if (!p) return 'Training burned discipline into every move.';
  return `Training burned discipline into every move: learning to wield ${p} without losing myself.`;
}
function losingRivalLine(): string {
  const alts = ['No—this isn’t how it ends!', 'Impossible… you were supposed to break.', 'Your light—too bright—', 'I… yield.', 'The fear… fades…'];
  return alts[hashStr(String(Date.now())) % alts.length];
}
function finalPageCaption(city: string): string {
  const c = (city || 'this city').trim();
  return `What ever comes my way, I will always protect ${c}. No matter what.`;
}
function discoveryHeroLine(superpower: string): string {
  const p = (superpower || 'this power').trim();
  return `Wait—did I just use ${p}?`;
}

/* ===================== Dialogue helpers & font ===================== */
function truncateToTwoSentences(text: string): string {
  const t = String(text || '').trim();
  if (!t) return t;
  const parts = t.split(/(?<=[.!?])\s+/);
  return parts.slice(0, 2).join(' ');
}

let comicFontLoading: Promise<void> | null = null;
function ensureComicFontLoaded(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (comicFontLoading) return comicFontLoading;

  comicFontLoading = new Promise<void>((resolve) => {
    const id = 'gf-bangers';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Bangers&display=swap';
      document.head.appendChild(link);
    }
    (document as any).fonts?.load?.('400 32px "Bangers"')
      ?.finally(() => (document as any).fonts?.ready?.then?.(() => resolve()) ?? resolve())
      ?? resolve();
  });

  return comicFontLoading;
}

/* ===================== Share helpers (watermark + share) ===================== */
async function drawWatermarkLocally(srcUrl: string, text: string): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.referrerPolicy = 'no-referrer';
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = srcUrl;
  });

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  const pad = Math.max(16, Math.round(w * 0.015));
  const fontSize = Math.max(28, Math.round(w * 0.035));
  ctx.font = `700 ${fontSize}px Arial`;
  ctx.textBaseline = 'bottom';
  const metrics = ctx.measureText(text);
  const x = w - pad;
  const y = h - pad;

  ctx.lineWidth = Math.ceil(fontSize * 0.18);
  ctx.strokeStyle = 'rgba(0,0,0,0.9)';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeText(text, x - metrics.width, y);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x - metrics.width, y);

  return canvas.toDataURL('image/jpeg', 0.92);
}
function dataURLToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

/* ===================== New helpers for uploads ===================== */
const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

// Try to read a profile tag set earlier in your flow
function getProfileId(): string | undefined {
  if (typeof window === 'undefined') return;
  return (localStorage.getItem('profileId') || localStorage.getItem('PROFILE_TAG') || localStorage.getItem('profile_tag') || undefined)?.trim();
}

/** Upload BOTH variants (dialogue + clean) for a panel in one request (with context carrying the prompt) */
async function uploadBothVariants(args: {
  publicId: string;
  dialogueBlob: Blob;
  cleanBlob: Blob;
  panelIndex: number;
  panelPrompt: string;
  extraTags?: string[];
}) {
  const { publicId, dialogueBlob, cleanBlob, panelIndex, panelPrompt, extraTags = [] } = args;

  const [fileBase64, cleanBase64] = await Promise.all([blobToDataUrl(dialogueBlob), blobToDataUrl(cleanBlob)]);

  const profileId = getProfileId();

  const res = await fetch('/api/cloudinary-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      profileId,
      publicId, // server will place into /dialogue and /clean subfolders
      folder: 'comic-exports', // base folder
      variant: 'dialogue', // primary payload is dialogue
      alsoUploadClean: true, // upload a clean copy too
      fileBase64, // dialogue (baked)
      cleanBase64, // clean (raw panel)
      extraTags: [...extraTags, `panel-${panelIndex}`, 'story_panel'],
      context: { panelIndex, panelPrompt },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Cloudinary dual-upload failed: ${res.status} ${err}`);
  }
  return (await res.json()) as {
    ok: boolean;
    uploads: Array<{ kind: 'dialogue' | 'clean'; secure_url: string; public_id: string }>;
  };
}

/* ===================== Robust fetch: generate-multi with retry ===================== */
async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function generatePanelImageWithRetry(args: {
  prompt: string | undefined;
  coverImageUrl: string;
  seed: number;
  forceRivalVisible?: boolean;
  maxAttempts?: number;
}) {
  const { prompt, coverImageUrl, seed, forceRivalVisible, maxAttempts = 3 } = args;

  let lastErr = 'Unknown error';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch('/api/generate-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          inputImageUrl: coverImageUrl,
          seed,
          forceRivalVisible: forceRivalVisible ? true : undefined,
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        lastErr = String((j as any)?.details || (j as any)?.error || `HTTP ${res.status}`);
        throw new Error(lastErr);
      }

      const j = await res.json();
      const url = (j as any)?.comicImageUrl;
      if (!url) {
        lastErr = 'No comicImageUrl returned';
        throw new Error(lastErr);
      }
      return { ok: true as const, url: String(url) };
    } catch (e: any) {
      lastErr = e?.message || String(e);
      if (attempt < maxAttempts) {
        await sleep(600 * attempt);
        continue;
      }
      return { ok: false as const, error: lastErr };
    }
  }

  return { ok: false as const, error: lastErr };
}

/* ===================== Page ===================== */

export default function ComicStoryPage() {
  const [inputs, setInputs] = useState<ComicRequest | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // NEW: generation progress
  const [genProgress, setGenProgress] = useState<{ i: number; total: number; label: string }>({
    i: 0,
    total: 0,
    label: '',
  });

  // Prepared files for DownloadAllNoZip (dialogue baked in) — now includes prompt + index
  const [prepared, setPrepared] = useState<{ url: string; name: string; ext: 'jpg'; panelIndex: number; prompt: string }[]>([]);
  const [preparing, setPreparing] = useState(false);
  const objectUrlsRef = useRef<string[]>([]); // revoke on unmount

  // Silent Cloudinary upload state (no UI shown)
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [cloudinaryLinks, setCloudinaryLinks] = useState<{ name: string; url: string }[]>([]);

  // Names used across UI and canvas — declare ONCE to avoid redeclare errors
  const [nameCtx, setNameCtx] = useState<{ superheroName: string; rivalName: string; companionName: string }>({
    superheroName: 'Hero',
    rivalName: 'Rival',
    companionName: 'Alex',
  });

  // NEW: share state (watermarked)
  const IG_HANDLE = '@comicmypage';
  const CAPTION = `Made my superhero cover! Try yours at ${IG_HANDLE} 🔥`;
  const [shareDataUrl, setShareDataUrl] = useState<string>(''); // watermarked cover for sharing
  const [displayCoverUrl, setDisplayCoverUrl] = useState<string>(''); // also used for mockups

  // NEW: simple mockup previews
  const MOCKUPS: Record<'shirt' | 'crop' | 'tote' | 'mug', string> = {
    shirt: '/mockups/tee-blank.png',
    crop: '/mockups/crop-blank.png',
    tote: '/mockups/tote-blank.png',
    mug: '/mockups/mug-blank.png',
  };
  const PRINT_BOX: Record<'shirt' | 'crop' | 'tote' | 'mug', { top: number; left: number; width: number; height: number; aspect: string }> = {
    shirt: { top: 23, left: 30.5, width: 40, height: 41, aspect: 'aspect-[4/5]' },
    crop: { top: 34, left: 34, width: 31, height: 42, aspect: 'aspect-[5/3]' },
    tote: { top: 48, left: 31, width: 39, height: 32, aspect: 'aspect-[3/4]' },
    mug: { top: 32, left: 29, width: 30, height: 37, aspect: 'aspect-[5/3]' },
  };

  const renderPreview = (type: 'shirt' | 'crop' | 'tote' | 'mug') => {
    const bg = MOCKUPS[type];
    const box = PRINT_BOX[type];
    const cover = displayCoverUrl || panels[0]?.imageUrl || '';
    return (
      <div className="rounded-2xl bg-neutral-900/80 border border-white/10 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className={`relative w-full ${box.aspect} rounded-xl overflow-hidden`}>
          <img
            src={bg}
            alt={`${type} blank`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
          <div
            className="absolute overflow-hidden flex items-center justify-center"
            style={{
              top: `${box.top}%`,
              left: `${box.left}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
          >
            <img src={cover} alt={`${type} print`} className="w-full h-full object-cover select-none" draggable={false} />
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    try {
      const rawInputs = localStorage.getItem('comicInputs');
      const coverImageUrl = localStorage.getItem('coverImageUrl');
      if (!rawInputs || !coverImageUrl) {
        setError('Missing comic inputs or cover image. Please go back and try again.');
        return;
      }
      const parsed: ComicRequest = JSON.parse(rawInputs);

      // DEFENSIVE defaults
      (parsed as any).fuel = (parsed as any).fuel ?? 'hope';
      (parsed as any).strength = (parsed as any).strength ?? 'courage';

      // recover hero name
      let storedHeroName = localStorage.getItem('heroName') || localStorage.getItem('superheroName') || (parsed as any).superheroName || '';

      if (!storedHeroName) {
        const blobs = ['coverMeta', 'coverResponse', 'coverData'];
        for (const key of blobs) {
          const raw = localStorage.getItem(key);
          if (!raw) continue;
          try {
            const obj = JSON.parse(raw);
            if (obj?.heroName) {
              storedHeroName = String(obj.heroName);
              localStorage.setItem('superheroName', storedHeroName);
              localStorage.setItem('heroName', storedHeroName);
              break;
            }
          } catch {}
        }
      }
      if (!storedHeroName) storedHeroName = 'Hero';

      setInputs({ ...parsed, selfieUrl: parsed.selfieUrl, superheroName: storedHeroName });

      // Deterministic seed for rival so 5 & 6 match
      const fearConcept = normalizeConceptForPrompt(parsed.fear);
      localStorage.setItem('rivalSeed', String(hashStr('rival:' + fearConcept)));

      const storyBeats: Panel[] = [
        { id: 0, imageUrl: coverImageUrl, status: 'done' }, // Cover

        {
          id: 1,
          status: 'idle',
          prompt: `Golden flashback. The hero as a child—same face and hair as the cover, just younger—sits sideways on old playground equipment in everyday clothes, holding a tiny keepsake from the past. EXACTLY ONE Best Friend appears (opposite gender of the hero, similar age as the hero). The Best Friend stands nearby, warm and supportive. Background: a faded corner of ${parsed.city} with cracked pavement and long shadows. Absolutely no superhero costume. 1980s comic art, no text.`,
        },
        {
          id: 2,
          status: 'idle',
          prompt: `Bright afternoon in ${parsed.city}. The hero wears only regular modern clothes (no hero costume), face & hair exactly match the cover image. Families on picnic blankets; children playing. ${parsed.superpower} flickers to life for the first time, rustling petals and leaves. Best Friend (single, opposite gender, similar age) reacts with WIDE-EYED SHOCK, mouth open, hands slightly raised—clearly surprised. No other friends. 1980s comic art, no text.`,
        },
        {
          id: 3,
          status: 'idle',
          prompt: `The hero alone in profile (not facing camera), in BLACK training clothes with jumper & trainers—face and hair match the cover image exactly. Show a dynamic athletic pose practicing ${parsed.superpower}. Setting: rooftop at dusk OR neon-lit gym OR windy field. 1980s comic art. no text.`,
        },
        {
          id: 4,
          status: 'idle',
          prompt: `First suit moment on a dusk rooftop in ${parsed.city}. The hero’s face, hair, & suit match the cover image exactly. Playful, cheeky triumph pose with ${parsed.superpower} unleashed. Best Friend (single, opposite gender) in regular clothes, admiring. Powers swirl confidently. 1980s comic art, no text at all.`,
        },
        {
          id: 5,
          status: 'idle',
          prompt: `Rain-soaked alley at night. Show ONE rival visually a creature derived from ${fearConcept}. FRAMING: include BOTH the hero and the rival face to face, each at least mid-torso in frame (no cropping out). Place them inches apart in tight side profile. The hero’s suit, face and hair match the cover image EXACTLY. 1980s comic art, no text.`,
        },
        {
          id: 6,
          status: 'idle',
          prompt: `Open plaza in ${parsed.city}, amazed pedestrians around. The SAME rival design from Panel 5 appears on-screen as identical silhouette. SHOW the rival mid-defeat: body recoiling, motion lines, debris, broken symbols of the ${fearConcept} scattering. The hero’s suit, face and hair match the cover image EXACTLY, in a dynamic sideways pose. Best Friend (single, opposite gender) cheers from the crowd, arms raised. No logos. 1980s comic art, no text.`,
        },

        // ✅ FIXED: Panel 7 is the celebration panel (2nd last)
        {
          id: 7,
          status: 'idle',
          prompt: `Victory celebration at dawn in ${parsed.city}. The hero’s suit, face and hair match the cover image EXACTLY, standing sideways on a ledge or raised platform. A small crowd and city responders cheer below with raised arms and smiles. EXACTLY ONE Best Friend appears (opposite gender, in regular clothes) close to the hero, celebrating. Confetti or light rays in the air. No rival. 1980s comic art, absolutely no on-image text or captions.`,
        },

        // ✅ Panel 8 remains back cover (no dialogue)
        {
          id: 8,
          status: 'idle',
          prompt: `BACK COVER of an 80s comic book with barcode and border - The hero from behind on a towering vantage at sunrise over ${parsed.city}, cape or coat flowing, subtle hints of new threats in the clouds or skyline (mysterious symbols, distant streaks of light). Energetic, optimistic tone—promise of bigger adventures ahead. Retro 1980s comic back-cover vibe, clean layout, dramatic lighting, absolutely NO on-image text or captions, and no speech bubbles.`,
        },
      ];

      setPanels(storyBeats);
      setPrepared([]); // clear any stale prepared downloads
      setHasGenerated(false);

      setNameCtx({
        superheroName: storedHeroName || 'Hero',
        rivalName: autoRivalNameFromFear(parsed.fear),
        companionName: getOrSetCompanionName(),
      });

      (async () => {
        try {
          const wm = await drawWatermarkLocally(coverImageUrl, IG_HANDLE);
          setShareDataUrl(wm);
          setDisplayCoverUrl(wm);
        } catch {
          setShareDataUrl(coverImageUrl);
          setDisplayCoverUrl(coverImageUrl);
        }
      })();
    } catch (err) {
      setError('Invalid or corrupted data. Please restart.');
      console.error('[ComicStoryPage] Error parsing inputs:', err);
    }
  }, []);

  // ===== Dialogue rule engine =====
  function enforceDialogueRules(ctx: {
    i: number;
    dialogue: DialogueLine[];
    hero: string;
    companion: string;
    rival: string;
    city: string;
    strength: string;
    lesson: string;
    superpower: string;
    fuel: string;
  }): DialogueLine[] {
    const { i, hero, companion, rival, city, superpower, strength } = ctx;
    let d = (ctx.dialogue || []).slice();

    const hKey = hero.trim().toLowerCase();
    const cKey = companion.trim().toLowerCase();
    const rKey = rival.trim().toLowerCase();

    // ✅ FIXED: allow companion on panel 7 celebration
    const isCompanionAllowed = (panelIndex: number) => [1, 2, 4, 6, 7].includes(panelIndex);
    const isRivalAllowed = (panelIndex: number) => [5, 6].includes(panelIndex);

    if (i === 8) return [];

    d = d.filter((x) => (x.text || '').trim().length > 0);

    if (!isRivalAllowed(i)) {
      d = d.filter((x) => x.speaker?.trim().toLowerCase() !== rKey);
    }
    if (!isCompanionAllowed(i)) {
      d = d.filter((x) => x.speaker?.trim().toLowerCase() !== cKey);
    }

    if (i === 1) {
      const introLine = `This is ${companion}, my best friend.`;
      const differentLine = `We both always knew there was something different about me.`;

      const hasIntro = d.some((x) => x.speaker?.trim().toLowerCase() === hKey && /best friend/i.test(x.text || ''));
      const hasDifferent = d.some(
        (x) => x.speaker?.trim().toLowerCase() === hKey && /something different/i.test(x.text || '')
      );

      if (!hasIntro) d.unshift({ speaker: hero, text: introLine });
      if (!hasDifferent) d.unshift({ speaker: hero, text: differentLine });

      const hasSupport = d.some((x) => x.speaker?.trim().toLowerCase() === cKey);
      if (!hasSupport && isCompanionAllowed(i)) {
        d.push({ speaker: companion, text: `Always had your back.` });
      }

      let compCount = 0;
      d = d.filter((x) => {
        if (x.speaker?.trim().toLowerCase() === cKey) {
          compCount += 1;
          return compCount <= 1;
        }
        return true;
      });
    }

    if (i === 2) {
      const p = (superpower || 'this power').trim();
      const heroHasDiscovery = d.some(
        (x) =>
          x.speaker?.trim().toLowerCase() === hKey &&
          /(wait|whoa|did i|what)/i.test(x.text || '') &&
          /(power|ability|use|did i just)/i.test(x.text || '')
      );
      if (!heroHasDiscovery) {
        d.unshift({ speaker: hero, text: discoveryHeroLine(superpower) });
      }

      const hasBF = d.some((x) => x.speaker?.trim().toLowerCase() === cKey);
      if (!hasBF && isCompanionAllowed(i)) {
        d.push({ speaker: companion, text: `What did I just see?! Was that ${p}?` });
      }

      let compCount2 = 0;
      d = d.filter((x) => {
        if (x.speaker?.trim().toLowerCase() === cKey) {
          compCount2 += 1;
          return compCount2 <= 1;
        }
        return true;
      });
    }

    if (i === 3) {
      const cap = trainingCaption(superpower);
      d = [{ speaker: '', text: cap }];
    }

    if (i === 6) {
      const strengthSafe = (strength || '').trim();
      if (strengthSafe) {
        const rx = new RegExp(strengthSafe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        d = d.filter((x) => !(x.speaker?.trim().toLowerCase() === hKey && rx.test(x.text || '')));
      }
      d = d.filter((x) => !(x.speaker?.trim().toLowerCase() === hKey && /\b(my )?strength\b/i.test(x.text || '')));

      const hasRivalLine = d.some((x) => x.speaker?.trim().toLowerCase() === rKey);
      if (!hasRivalLine) {
        d.push({ speaker: rival, text: losingRivalLine() });
      }
    }

    // ✅ FIXED: Panel 7 is celebration (hero + friend + optional crowd caption)
    if (i === 7) {
      // keep only allowed speakers (hero + companion + caption '')
      d = d.filter((x) => {
        const k = (x.speaker || '').trim().toLowerCase();
        return k === '' || k === hKey || k === cKey;
      });

      const crowdCaption = `The city erupts in cheers. ${hero} did it.`;
      const bfLine = `You did it, ${hero}!!`;
      const heroLine = `We’re safe. For now.`;

      const hasCaption = d.some((x) => (x.speaker || '').trim() === '');
      if (!hasCaption) d.unshift({ speaker: '', text: crowdCaption });

      const hasBF = d.some((x) => x.speaker?.trim().toLowerCase() === cKey);
      if (!hasBF) d.push({ speaker: companion, text: bfLine });

      const hasHero = d.some((x) => x.speaker?.trim().toLowerCase() === hKey);
      if (!hasHero) d.push({ speaker: hero, text: heroLine });

      // Limit companion to 1 line
      let compCount7 = 0;
      d = d.filter((x) => {
        if (x.speaker?.trim().toLowerCase() === cKey) {
          compCount7 += 1;
          return compCount7 <= 1;
        }
        return true;
      });
    }

    d = d.map((x) => ({ ...x, text: truncateToTwoSentences(x.text) }));
    return d;
  }

  // === Generation flow (images + dialogue) — FIXED ===
  useEffect(() => {
    const autoGenerate = async () => {
      if (!inputs || panels.length === 0 || hasGenerated) return;

      const coverImageUrl = localStorage.getItem('coverImageUrl');
      if (!coverImageUrl) {
        setError('Cover image not found! Please generate the cover first.');
        return;
      }

      setLoading(true);
      setError(null);

      let currentHeroName = inputs.superheroName || localStorage.getItem('superheroName') || localStorage.getItem('heroName') || 'Hero';

      const rivalName = nameCtx.rivalName;
      const companionName = nameCtx.companionName;

      const rivalSeed = Number(localStorage.getItem('rivalSeed') || hashStr(inputs.fear || ''));

      const totalToGenerate = panels.length - 1; // panels 1..8
      setGenProgress({ i: 0, total: totalToGenerate, label: 'Starting…' });

      try {
        for (let i = 1; i < panels.length; i++) {
          setPanels((prev) => prev.map((p) => (p.id === i ? { ...p, status: 'generating', error: undefined } : p)));

          setGenProgress({
            i: i - 1,
            total: totalToGenerate,
            label: `Generating panel ${i} of ${totalToGenerate}…`,
          });

          const panel = panels[i];

          const panelSeed = i === 5 || i === 6 ? rivalSeed : hashStr((inputs.fear || '') + '|panel:' + i);

          const gen = await generatePanelImageWithRetry({
            prompt: panel.prompt,
            coverImageUrl,
            seed: panelSeed,
            forceRivalVisible: i === 6 ? true : false,
            maxAttempts: 3,
          });

          if (!gen.ok) {
            setPanels((prev) =>
              prev.map((p) => (p.id === i ? { ...p, status: 'failed', error: gen.error || 'Generation failed' } : p))
            );
            continue;
          }

          let dialogue: DialogueLine[] = [];
          if (i !== 8) {
            try {
              const dlgRes = await fetch('/api/generate-dialogue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  panelPrompt: panel.prompt,
                  panelIndex: i,
                  userInputs: {
                    ...inputs,
                    superheroName: currentHeroName,
                    rivalName,
                    companionName,
                  },
                  constraints: { maxSentencesPerBubble: 2 },
                }),
              });

              const dlgJson = await dlgRes.json().catch(() => ({}));

              const echoed = (dlgJson as any)?.names?.superheroName;
              if (echoed && typeof echoed === 'string' && echoed.trim() && echoed !== currentHeroName) {
                currentHeroName = echoed.trim();
                localStorage.setItem('superheroName', currentHeroName);
                localStorage.setItem('heroName', currentHeroName);
                setInputs((prev) => (prev ? { ...prev, superheroName: currentHeroName } : prev));
                setNameCtx((prev) => ({ ...prev, superheroName: currentHeroName }));
              }

              dialogue = ((dlgJson as any).dialogue || []).map((d: any) => ({
                speaker: String(d.speaker || currentHeroName),
                text: truncateToTwoSentences(d.text || ''),
              }));
            } catch (dlgErr) {
              console.warn(`[ComicStoryPage] Dialogue gen failed panel ${i}`, dlgErr);
              dialogue = [{ speaker: currentHeroName, text: '...' }];
            }

            dialogue = enforceDialogueRules({
              i,
              dialogue,
              hero: currentHeroName,
              companion: companionName,
              rival: rivalName,
              city: inputs.city,
              strength: inputs.strength,
              lesson: inputs.lesson,
              superpower: inputs.superpower,
              fuel: inputs.fuel ?? '',
            });
          } else {
            dialogue = [];
          }

          setPanels((prev) =>
            prev.map((p) => (p.id === i ? { ...p, imageUrl: gen.url, dialogue, status: 'done', error: undefined } : p))
          );

          setGenProgress({
            i,
            total: totalToGenerate,
            label: `Finished panel ${i} of ${totalToGenerate}`,
          });
        }

        const finalOk = (arr: Panel[]) => arr.slice(1).every((p) => !!p.imageUrl);

        setPanels((prev) => {
          const ok = finalOk(prev);
          if (ok) {
            setHasGenerated(true);
            setGenProgress((p) => ({ ...p, label: 'All panels generated!' }));
            console.log('[ComicStoryPage] All panels generated!');
          } else {
            setGenProgress((p) => ({ ...p, label: 'Some panels failed — retry needed.' }));
            console.warn('[ComicStoryPage] Some panels failed. Not marking hasGenerated.');
          }
          return prev;
        });
      } catch (err) {
        setError('Something went wrong while generating story panels.');
        console.error('[ComicStoryPage] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (inputs && panels.length > 1 && panels[0]?.imageUrl && !hasGenerated) {
      autoGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, panels.length, hasGenerated, nameCtx.rivalName, nameCtx.companionName]);

  /** ▶️ Render a panel + dialogue overlay into JPEG and return Blob */
  const renderPanelWithDialogueToJpeg = async (url: string, dialogue?: DialogueLine[], quality = 0.92): Promise<Blob> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch panel image');
    const imgBlob = await res.blob();
    const objUrl = URL.createObjectURL(imgBlob);

    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = objUrl;
      });

      await ensureComicFontLoaded();

      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2D context');

      ctx.drawImage(img, 0, 0, w, h);

      const linesIn: { speaker?: string; text: string }[] = (dialogue || [])
        .map((d) => ({ speaker: (d.speaker || '').trim(), text: String(d.text || '').trim() }))
        .filter((l) => l.text.length > 0);

      const pad = Math.max(16, Math.round(w * 0.02));
      const lineGap = Math.max(6, Math.round(w * 0.008));
      const fontSize = Math.min(34, Math.max(18, Math.round(w * 0.028)));
      const fontFamily = `"Bangers","Impact","Arial Black","Comic Sans MS","Trebuchet MS",Arial,sans-serif`;
      (ctx as CanvasRenderingContext2D).font = `400 ${fontSize}px ${fontFamily}`;
      (ctx as CanvasRenderingContext2D).textBaseline = 'alphabetic';
      (ctx as CanvasRenderingContext2D).lineJoin = 'round';

      const fixedLabelColors: Record<string, string> = {
        [nameCtx.superheroName.trim().toLowerCase()]: '#FFD700',
        [nameCtx.rivalName.trim().toLowerCase()]: '#FF4500',
        [nameCtx.companionName.trim().toLowerCase()]: '#00BFFF',
      };
      const palette = ['#F5C242', '#4DD0E1', '#F97316', '#22C55E', '#EC4899', '#A78BFA', '#10B981', '#60A5FA', '#F43F5E', '#EAB308'];
      const colorMap: Record<string, string> = {};
      const getColorForSpeaker = (name?: string) => {
        const key = (name || '').trim().toLowerCase();
        if (!key) return '#F5C242';
        if (fixedLabelColors[key]) return fixedLabelColors[key];
        if (!colorMap[key]) {
          const idx = Object.keys(colorMap).length % palette.length;
          colorMap[key] = palette[idx];
        }
        return colorMap[key];
      };

      const maxTextWidth = w - pad * 2;
      const measure = (t: string) => (ctx as CanvasRenderingContext2D).measureText(t).width;

      type ChunkLine = { chunks: { text: string; color: string }[] };
      const wrapped: ChunkLine[] = [];

      const wrapText = (full: string, label?: string, labelColor?: string) => {
        const words = full.split(/\s+/);
        let curr = '';
        let firstLine = true;

        const flush = (lineText: string) => {
          const chunks: { text: string; color: string }[] = [];
          if (firstLine && label && labelColor) {
            if (lineText.startsWith(label)) {
              chunks.push({ text: label, color: labelColor });
              chunks.push({ text: lineText.slice(label.length), color: '#FFFFFF' });
            } else {
              chunks.push({ text: lineText, color: '#FFFFFF' });
            }
            firstLine = false;
          } else {
            chunks.push({ text: lineText, color: '#FFFFFF' });
          }
          wrapped.push({ chunks });
        };

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const test = curr ? `${curr} ${word}` : word;
          if (measure(test) <= maxTextWidth) {
            curr = test;
          } else {
            if (curr) flush(curr);
            curr = word;
          }
        }
        if (curr) flush(curr);
      };

      for (const entry of linesIn) {
        const hasLabel = !!entry.speaker;
        const label = hasLabel ? `${entry.speaker}: ` : '';
        const labelColor = hasLabel ? getColorForSpeaker(entry.speaker) : undefined;
        wrapText(label + entry.text, hasLabel ? label : undefined, labelColor);
      }

      const blockHeight = wrapped.length > 0 ? wrapped.length * (fontSize + lineGap) + pad * 2 : 0;

      if (wrapped.length > 0) {
        (ctx as CanvasRenderingContext2D).fillStyle = 'rgba(0,0,0,0.55)';
        (ctx as CanvasRenderingContext2D).fillRect(0, h - blockHeight, w, blockHeight);

        (ctx as CanvasRenderingContext2D).font = `400 ${fontSize}px ${fontFamily}`;
        const strokeWidth = Math.max(2, Math.round(fontSize * 0.13));
        (ctx as CanvasRenderingContext2D).lineWidth = strokeWidth;

        let y = h - blockHeight + pad + fontSize;
        for (const line of wrapped) {
          let x = pad;
          for (const chunk of line.chunks) {
            (ctx as CanvasRenderingContext2D).strokeStyle = 'rgba(0,0,0,0.95)';
            (ctx as CanvasRenderingContext2D).strokeText(chunk.text, x, y);
            (ctx as CanvasRenderingContext2D).fillStyle = chunk.color;
            (ctx as CanvasRenderingContext2D).fillText(chunk.text, x, y);
            x += measure(chunk.text);
          }
          y += fontSize + lineGap;
        }
      }

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const bin = atob(dataUrl.split(',')[1] || '');
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return new Blob([buf], { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  };

  const [preparedOnce, setPreparedOnce] = useState(false);
  const prepareDownloadFiles = async () => {
    if (!panels?.length) return;
    setPreparing(true);

    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];

    const heroSlug = (nameCtx.superheroName || 'Hero').replace(/\s+/g, '_');
    const out: { url: string; name: string; ext: 'jpg'; panelIndex: number; prompt: string }[] = [];

    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      if (!p.imageUrl) continue;
      try {
        const blob = await renderPanelWithDialogueToJpeg(p.imageUrl, p.id === 8 ? [] : p.dialogue, 0.92);
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.push(url);
        const name = `${heroSlug}_panel-${i}`;
        out.push({ url, name, ext: 'jpg', panelIndex: i, prompt: String(p.prompt || '') });
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 60));
      } catch (e) {
        console.warn('Failed preparing panel', i, e);
      }
    }

    setPrepared(out);
    setPreparing(false);
    setPreparedOnce(true);
  };

  useEffect(() => {
    if (hasGenerated && panels.every((p) => p.imageUrl) && !preparedOnce) {
      prepareDownloadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGenerated, panels, preparedOnce]);

  /* ===================== Auto-upload BOTH variants silently (with prompt context) ===================== */
  useEffect(() => {
    const run = async () => {
      if (!preparedOnce || uploading) return;

      try {
        const coverUrl = localStorage.getItem('coverImageUrl');
        if (!coverUrl) return;

        setUploading(true);
        setCloudinaryLinks([]);
        const heroSlug = (nameCtx.superheroName || 'Hero').replace(/\s+/g, '_');

        const links: { name: string; url: string }[] = [];
        let count = 0;

        const totalUploads = prepared.length;
        setUploadProgress({ done: 0, total: totalUploads });

        for (let i = 0; i < panels.length; i++) {
          const p = panels[i];
          if (!p?.imageUrl) continue;

          const baked = prepared.find((f) => f.panelIndex === i);
          if (!baked) continue;

          const [bakedBlob, rawBlob] = await Promise.all([
            fetch(baked.url).then((r) => r.blob()),
            (i === 0 ? fetch(coverUrl) : fetch(p.imageUrl)).then((r) => r.blob()),
          ]);

          const resp = await uploadBothVariants({
            publicId: `${heroSlug}_panel-${i}`,
            dialogueBlob: bakedBlob,
            cleanBlob: rawBlob,
            panelIndex: i,
            panelPrompt: String(p.prompt || ''),
            extraTags: [],
          });

          const dlg = resp.uploads.find((u) => u.kind === 'dialogue');
          const cln = resp.uploads.find((u) => u.kind === 'clean');
          if (dlg) links.push({ name: `${heroSlug}_panel-${i}(dialogue)`, url: dlg.secure_url });
          if (cln) links.push({ name: `${heroSlug}_panel-${i}(clean)`, url: cln.secure_url });

          count++;
          setUploadProgress({ done: count, total: totalUploads });
          await new Promise((r) => setTimeout(r, 80));
        }

        setCloudinaryLinks(links);
      } catch (e) {
        console.warn('Cloudinary upload error:', e);
      } finally {
        setUploading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preparedOnce, prepared, nameCtx.superheroName]);

  const normalizeSpeakerName = (speakerRaw: string, hero: string, rival: string, companion: string) => {
    const s = String(speakerRaw || '').trim();
    const norm = s.toLowerCase().replace(/[^a-z]/g, '');
    if (norm === '') return '';
    if (['narrator', 'caption', 'voiceover'].includes(norm)) return '';
    if (['hero', 'thehero', 'maincharacter', 'protagonist'].includes(norm)) return hero;
    if (/(bestfriend|companion|friend|sidekick)/.test(norm)) return companion;
    if (/(rival|villain|enemy|antagonist)/.test(norm)) return rival;
    return s;
  };

  const percent = genProgress.total > 0 ? Math.min(100, Math.round((genProgress.i / genProgress.total) * 100)) : 0;

  const handleShare = async () => {
    if (!shareDataUrl) return;
    try {
      await navigator.clipboard.writeText(CAPTION);
    } catch {}
    try {
      const blob = dataURLToBlob(shareDataUrl);
      const file = new File([blob], 'superhero-cover.jpg', { type: 'image/jpeg' });
      // @ts-ignore
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // @ts-ignore
        await navigator.share({ files: [file], text: CAPTION, title: 'My Superhero Cover' });
        return;
      }
    } catch {}
    try {
      const blob = dataURLToBlob(shareDataUrl);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'superhero-cover.jpg';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
      alert(`Image saved. Your caption (with ${IG_HANDLE}) is copied—paste it in Instagram.`);
    } catch {
      alert(`Couldn’t prepare the share image. Caption: ${CAPTION}`);
    }
  };

  return (
    <div className="p-4 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center">📖 Your Hero’s Origin Story</h1>
      {error && <p className="text-red-400 text-center">{error}</p>}

      {loading && (
        <div className="mx-auto w-full max-w-lg bg-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>{genProgress.label || 'Generating…'}</span>
            <span>{percent}%</span>
          </div>
          <div className="h-2 w-full bg-white/20 rounded">
            <div
              className="h-2 bg-white rounded transition-all"
              style={{ width: `${percent}%` }}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              role="progressbar"
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 items-center">
        {panels.map((panel, idx) => {
          const fixedDialogue =
            panel.dialogue?.map((d) => {
              const fixedSpeaker = normalizeSpeakerName(d.speaker, nameCtx.superheroName, nameCtx.rivalName, nameCtx.companionName);
              const fixedText = truncateToTwoSentences((d.text || '').replace(/\bHero\b/gi, nameCtx.superheroName).replace(/{heroName}/gi, nameCtx.superheroName));
              return { ...d, speaker: fixedSpeaker, text: fixedText };
            }) ?? panel.dialogue;

          return (
            <div key={panel.id} className="w-full max-w-lg rounded overflow-hidden shadow-lg bg-white text-black">
              {panel.imageUrl ? (
                <ComicPanel
                  imageUrl={panel.imageUrl}
                  dialogue={fixedDialogue}
                  isCover={idx === 0}
                  superheroName={nameCtx.superheroName}
                  rivalName={nameCtx.rivalName}
                  companionName={nameCtx.companionName}
                />
              ) : panel.status === 'failed' ? (
                <div className="h-[400px] flex flex-col items-center justify-center bg-gray-200 px-6 text-center">
                  <p className="text-red-600 font-semibold">Panel {panel.id + 1} failed</p>
                  <p className="text-gray-700 text-sm mt-2">{panel.error || 'Generation failed. Try again.'}</p>
                  <p className="text-gray-500 text-xs mt-2">Tip: refresh the page to retry generation.</p>
                </div>
              ) : (
                <div className="h-[400px] flex items-center justify-center bg-gray-200">
                  <p className="text-gray-600">Waiting for panel {panel.id + 1}…</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {(loading || preparing) && (
        <div className="text-center text-lg text-blue-300">{loading ? 'Generating Story Panels…' : 'Preparing downloads…'}</div>
      )}

      <div className="mx-auto w-full max-w-3xl">
        <button
          onClick={handleShare}
          className="w-full px-6 py-4 rounded-2xl text-white shadow transition text-lg font-semibold
                     bg-gradient-to-r from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5]
                     hover:brightness-110 disabled:opacity-60"
          disabled={!shareDataUrl}
        >
          Share on Instagram
        </button>
      </div>

      {panels.length > 0 && !loading && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={prepareDownloadFiles}
            disabled={preparing}
            className={`px-5 py-2 rounded font-semibold ${
              preparing ? 'bg-blue-900 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {preparing ? 'Preparing…' : prepared.length ? 'Re-prepare (refresh overlays)' : 'Prepare for Download'}
          </button>

          {prepared.length > 0 && (
            <DownloadAllNoZip
              files={prepared.map((f) => ({ url: f.url, name: f.name, ext: 'jpg' }))}
              baseName={(nameCtx.superheroName || 'comic').replace(/\s+/g, '_')}
              delayMs={350}
            />
          )}

          <p className="text-xs text-white/60">Tip: “Prepare” bakes speech bubbles into each image.</p>
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/comic/merch"
          className="mt-2 block w-full px-6 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow transition text-lg font-extrabold text-center"
          aria-label="Get Merch"
        >
          Get Merch 🛒
        </Link>
      </div>

      {displayCoverUrl && (
        <div className="mx-auto w-full max-w-3xl">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            <div className="text-center">
              {renderPreview('shirt')}
              <div className="mt-2 text-sm text-neutral-200 font-semibold">T-Shirt</div>
            </div>
            <div className="text-center">
              {renderPreview('crop')}
              <div className="mt-2 text-sm text-neutral-200 font-semibold">Women Crop Top</div>
            </div>
            <div className="text-center">
              {renderPreview('tote')}
              <div className="mt-2 text-sm text-neutral-200 font-semibold">Tote Bag</div>
            </div>
            <div className="text-center">
              {renderPreview('mug')}
              <div className="mt-2 text-sm text-neutral-200 font-semibold">Mug</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
