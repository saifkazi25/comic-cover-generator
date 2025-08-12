'use client';

import { useEffect, useRef, useState } from 'react';
import ComicPanel from '../../../components/ComicPanel';
import DownloadAllNoZip from '../../../components/DownloadAllNoZip';

interface ComicRequest {
  gender: string;
  childhood: string;   // 2. What word best describes your childhood?
  superpower: string;
  city: string;
  fear: string;        // 5. Your enemy is the embodiment of your deepest fear. What form does it take?
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
interface Panel {
  id: number;
  prompt?: string;
  imageUrl?: string;
  dialogue?: DialogueLine[];
}

/* ===================== Utilities & naming ===================== */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function tc(s: string) {
  return s.split(/\s+/).filter(Boolean).map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ');
}

/** Scary rival name inspired by user input (strips a/an/the; deterministic) */
function autoRivalNameFromFear(fearRaw: string) {
  const raw = (fearRaw || "").trim();
  const fear = raw.toLowerCase();

  if (!fear) return "The Nemesis";

  // Curated fast-paths
  if (/(height|vertigo|fall)/.test(fear)) return "Lord Vertigo";
  if (/(failure|not good enough|waste|potential|loser)/.test(fear)) return "The Dreadwraith";
  if (/(rejection|abandon|alone|lonely)/.test(fear)) return "Echo Null";
  if (/(dark|night)/.test(fear)) return "Nightveil";
  if (/(spider|insect|bug)/.test(fear)) return "Iron Widow";
  if (/(snake|serpent)/.test(fear)) return "Neon Seraphis";
  if (/(public speaking|stage|crowd)/.test(fear)) return "Many-Mouth";
  if (/(death|mortality)/.test(fear)) return "King Thanix";
  if (/dementor/.test(fear)) return "The Dreadmonger";

  // Clean, strip leading articles
  const cleaned = raw
    .replace(/my\s+/i, "")
    .replace(/[^a-zA-Z0-9\s\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleaned.replace(/^(a|an|the)\s+/i, "").trim();
  if (!base) return "The Nemesis";

  const strongNouns = /(creature|beast|demon|wraith|phantom|reaper|fiend|spirit|guardian|monster|witch|warlock|shadow|specter|serpent|spider|ghost|golem|titan|colossus|kraken|dragon)/i;
  const epithets = ["Dread","Night","Shadow","Void","Grave","Hex","Ash","Iron","Storm","Nether","Bone","Blood","Frost","Ember"];
  const suffixes = ["Wraith","Monger","Reaver","Shade","Maul","Bane","Ruin","Scourge","Tyrant"];
  const h = hashStr(base);
  const pick = (arr: string[]) => arr[h % arr.length];

  if (/\s/.test(base)) {
    const e = pick(epithets);
    const alreadyHas = new RegExp(`\\b${e}\\b`, "i").test(base);
    const named = `The ${alreadyHas ? "" : e + " "}${tc(base)}`.replace(/\s+/g, " ").trim();
    return named;
  }

  if (strongNouns.test(base)) {
    const e = pick(epithets);
    return `The ${e} ${tc(base)}`.replace(/\s+/g, " ").trim();
  } else {
    const sfx = pick(suffixes);
    return `The ${tc(base)} ${sfx}`.replace(/\s+/g, " ").trim();
  }
}

/** Persist a gender-neutral companion name */
function getOrSetCompanionName(): string {
  if (typeof window === 'undefined') return "Alex";
  const existing = localStorage.getItem('companionName');
  if (existing) return existing;
  const pool = [
    "Alex","Sam","Jordan","Casey","Taylor","Morgan",
    "Riley","Jamie","Avery","Cameron","Quinn","Rowan",
    "Skyler","Elliot","Harper","Reese","Drew","Sage",
    "Parker","Blair"
  ];
  const pick = pool[Math.floor(Math.random() * Math.random() * pool.length) % pool.length] || "Alex";
  localStorage.setItem('companionName', pick);
  return pick;
}

/** Lightly normalize free-text for prompts (avoid quoting user verbatim) */
function normalizeConceptForPrompt(text: string): string {
  const t = (text || '').replace(/["'“”‘’]/g, '').trim();
  return t.replace(/[^a-zA-Z0-9,\-\s]/g, '').replace(/\s+/g, ' ');
}

/* ====== Paraphrase helpers (avoid verbatim user words in captions) ====== */
function stylizeChildhood(word: string): string {
  const w = (word || '').toLowerCase().trim();
  const map: Record<string, string> = {
    tough: 'a rough-edged childhood that taught grit',
    hard: 'a rough-edged childhood that taught grit',
    strict: 'an orderly childhood that sharpened discipline',
    happy: 'a sunlit childhood full of small victories',
    lonely: 'a quiet childhood that forged self-reliance',
    chaotic: 'a stormy childhood that taught balance',
    carefree: 'an easygoing childhood that hid deeper questions',
    loving: 'a warm childhood that planted courage',
    resilient: 'a trial-by-fire childhood that tempered resolve',
  };
  if (map[w]) return map[w];
  if (!w) return 'a childhood that shaped resilience';
  return `a formative childhood that molded resolve`;
}

function trainingCaption(superpower: string): string {
  const p = (superpower || '').trim();
  if (!p) return 'Training burned discipline into every move.';
  return `Hours blurred into form: learning to wield ${p} without losing myself.`;
}

function losingRivalLine(): string {
  const alts = [
    'No—this isn’t how it ends!',
    'Impossible… you were supposed to break.',
    'Your light—too bright—',
    'I… yield.',
    'The fear… fades…'
  ];
  return alts[hashStr(String(Date.now())) % alts.length];
}

/** Creative final-page caption (hero voice; weaves inputs without quoting verbatim) */
function finalPageCaption(city: string, lesson: string, fuel: string, superpower: string, rivalName: string): string {
  const c = (city || 'this city').trim();
  const l = (lesson || 'strength is something we choose').trim();
  const f = (fuel || 'heart').trim();
  const p = (superpower || 'what I carry').trim();
  const r = (rivalName || 'my fear').trim();
  const line1 = `Dawn finds me over ${c}—${p} quiet, ${f} full.`;
  const line2 = `I faced ${r} and learned ${l}.`;
  return `${line1} ${line2}`;
}

/* ===== New: discovery helper for Panel 2 ===== */
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

  // Prepared files for DownloadAllNoZip (dialogue baked in)
  const [prepared, setPrepared] = useState<{ url: string; name: string; ext: 'jpg' }[]>([]);
  const [preparing, setPreparing] = useState(false);
  const objectUrlsRef = useRef<string[]>([]); // revoke on unmount

  // NEW: Cloudinary upload state (uploads still run silently; no links shown)
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [cloudinaryLinks, setCloudinaryLinks] = useState<{ name: string; url: string }[]>([]);

  // Names used across UI and canvas — declare ONCE to avoid redeclare errors
  const [nameCtx, setNameCtx] = useState<{
    superheroName: string;
    rivalName: string;
    companionName: string;
  }>({ superheroName: 'Hero', rivalName: 'Rival', companionName: 'Alex' });

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
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

      // recover hero name
      let storedHeroName =
        localStorage.getItem('heroName') ||
        localStorage.getItem('superheroName') ||
        (parsed as any).superheroName ||
        '';

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

      const childMood = stylizeChildhood(parsed.childhood);

      const storyBeats: Panel[] = [
        { id: 0, imageUrl: coverImageUrl }, // Cover

        {
          id: 1,
          prompt: `Golden flashback. The hero as a child—same face and hair as the cover, just younger sits sideways on old playground equipment in everyday clothes, holding a tiny keepsake from ${childMood}. EXACTLY ONE Best Friend appears (opposite gender of the hero, similar age as the hero). The Best Friend stands nearby, warm and supportive. Background: a faded corner of ${parsed.city} with cracked pavement and long shadows. Absolutely no superhero costume. 1980s comic art, no text.`
        },
        {
          id: 2,
          prompt: `Bright afternoon in ${parsed.city}. The hero wears only regular modern clothes (no costume), face & hair clearly match the cover image. Families on picnic blankets; children playing. ${parsed.superpower} flickers to life for the first time, rustling petals and leaves. Best Friend (single, opposite gender, similar age) peeks from behind a bench—no additional friends. 1980s comic art, no text.`
        },
        {
          id: 3,
          prompt: `The hero alone in profile (not facing camera), in training clothes with jumper & trainers—face and hair match the cover image exactly. Show a dynamic athletic pose practicing ${parsed.superpower}. Setting: rooftop at dusk OR neon-lit gym OR windy field. 1980s comic art. no text.`
        },
        {
          id: 4,
          prompt: `First suit moment on a dusk rooftop in ${parsed.city}. The hero’s face, hair, & suit match the cover image exactly. Playful, cheeky triumph pose with ${parsed.superpower} unleashed. Best Friend (single, opposite gender) in regular clothes, admiring. Powers swirl confidently. 1980s comic art, no text at all.`
        },
        {
          id: 5,
          prompt: `Rain-soaked alley at night. Show ONE rival visually a creature derived from ${fearConcept}. FRAMING: include BOTH the hero and the rival face to face, each at least mid-torso in frame (no cropping out). Place them inches apart in tight side profile. The hero exact matches the cover image with regards to face, hair and suit. 1980s comic art, no text.`
        },
        {
          id: 6,
          prompt: `Open plaza in ${parsed.city}, amazed pedestrians around. The SAME rival design from Panel 5 appears on-screen as identical silhouette. SHOW the rival mid-defeat: body recoiling, motion lines, debris, broken symbols of the ${fearConcept} scattering. The hero—matching the cover—unleashes ${parsed.strength} in a dynamic sideways pose. Best Friend (single, opposite gender) cheers from the crowd, arms raised. No logos. 1980s comic art, no text.`
        },
        {
          id: 7,
          prompt: `Dawn. The hero stands sideways atop a ledge in ${parsed.city}, reflective pose with cape aloft. The hero’s suit, face and hair match the cover image EXACTLY. Skyline with local landmarks. The lesson should be felt, not quoted verbatim, through posture and golden light. Alone—no other characters. 1980s comic art, no text.`
        },
        // NEW: Back cover (no dialogue)
        {
          id: 8,
          prompt: `BACK COVER of an 80s comic book with barcode and border - The hero from behind on a towering vantage at sunrise over ${parsed.city}, cape or coat flowing, subtle hints of new threats in the clouds or skyline (mysterious symbols, distant streaks of light). Energetic, optimistic tone—promise of bigger adventures ahead. Retro 1980s comic back-cover vibe, clean layout, dramatic lighting, absolutely NO on-image text or captions, and no speech bubbles.`
        }
      ];

      setPanels(storyBeats);
      setPrepared([]); // clear any stale prepared downloads
      setHasGenerated(false);

      // set names once here
      setNameCtx({
        superheroName: storedHeroName || 'Hero',
        rivalName: autoRivalNameFromFear(parsed.fear),
        companionName: getOrSetCompanionName(),
      });

      console.log('[ComicStoryPage] Panels set:', storyBeats);
    } catch (err) {
      setError('Invalid or corrupted data. Please restart.');
      console.error('[ComicStoryPage] Error parsing inputs:', err);
    }
  }, []);

  // === Generation flow (images + dialogue) + surgical dialogue rules ===
  useEffect(() => {
    const autoGenerate = async () => {
      if (!inputs || panels.length === 0 || panels[0]?.imageUrl === undefined || hasGenerated) return;

      setLoading(true);
      setError(null);

      const coverImageUrl = localStorage.getItem('coverImageUrl');
      if (!coverImageUrl) {
        setError('Cover image not found! Please generate the cover first.');
        setLoading(false);
        return;
      }

      let currentHeroName =
        inputs.superheroName ||
        localStorage.getItem('superheroName') ||
        localStorage.getItem('heroName') ||
        'Hero';

      const rivalName = nameCtx.rivalName;
      const companionName = nameCtx.companionName;

      const rivalSeed = Number(localStorage.getItem('rivalSeed') || hashStr(inputs.fear || ''));
      const genPanels: Panel[] = [{ ...panels[0], imageUrl: coverImageUrl }];

      // NEW: init progress
      const totalToGenerate = panels.length - 1; // panels 1..8
      setGenProgress({ i: 0, total: totalToGenerate, label: 'Starting…' });

      try {
        for (let i = 1; i < panels.length; i++) {
          const panel = panels[i];

          // progress update: "working on panel i"
          setGenProgress({
            i: i - 1, // already completed
            total: totalToGenerate,
            label: `Generating panel ${i} of ${totalToGenerate}…`,
          });

          // Choose seed: identical for 5 & 6, varied for others
          const panelSeed = (i === 5 || i === 6)
            ? rivalSeed
            : hashStr((inputs.fear || '') + '|panel:' + i);

          // 1) Generate image
          const imgRes = await fetch('/api/generate-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: panel.prompt,
              inputImageUrl: coverImageUrl,
              seed: panelSeed,
              // optional hint for your backend to validate rival presence in panel 6
              forceRivalVisible: i === 6 ? true : undefined
            }),
          });
          const imgJson = await imgRes.json();

          // 2) Generate dialogue (SKIP for back cover panel 8)
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
                    companionName
                  },
                  constraints: { maxSentencesPerBubble: 2 }
                }),
              });
              const dlgJson = await dlgRes.json();
              const echoed = dlgJson?.names?.superheroName;
              if (echoed && typeof echoed === 'string' && echoed.trim() && echoed !== currentHeroName) {
                currentHeroName = echoed.trim();
                localStorage.setItem('superheroName', currentHeroName);
                localStorage.setItem('heroName', currentHeroName);
                setInputs(prev => prev ? { ...prev, superheroName: currentHeroName } : prev);
                setNameCtx(prev => ({ ...prev, superheroName: currentHeroName }));
              }
              dialogue = (dlgJson.dialogue || []).map((d: any) => ({
                speaker: String(d.speaker || currentHeroName),
                text: truncateToTwoSentences(d.text || '')
              }));
            } catch (dlgErr) {
              console.warn(`[ComicStoryPage] Dialogue gen failed panel ${i}`, dlgErr);
              dialogue = [{ speaker: currentHeroName, text: "..." }];
            }

            // 3) Surgical dialogue rules (not applied to 8)
            dialogue = enforceDialogueRules({
              i,
              dialogue,
              hero: currentHeroName,
              companion: companionName,
              rival: rivalName,
              city: inputs.city,
              childhoodWord: inputs.childhood,
              strength: inputs.strength,
              lesson: inputs.lesson,
              superpower: inputs.superpower,
              fuel: inputs.fuel ?? ''
            });
          } else {
            // Ensure absolutely no dialogue on back cover
            dialogue = [];
          }

          genPanels.push({
            ...panel,
            imageUrl: imgJson.comicImageUrl,
            dialogue,
          });

          // progress update: after finishing this panel
          setGenProgress({
            i,
            total: totalToGenerate,
            label: `Finished panel ${i} of ${totalToGenerate}`,
          });
        }

        setPanels(genPanels);
        setHasGenerated(true);
        setGenProgress(prev => ({ ...prev, label: 'All panels generated!' }));
        console.log('[ComicStoryPage] All panels generated!');
      } catch (err) {
        setError('Something went wrong while generating story panels.');
        console.error('[ComicStoryPage] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (panels.length > 1 && panels[0].imageUrl && !panels[1]?.imageUrl && !hasGenerated) {
      autoGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, panels, hasGenerated, nameCtx.rivalName, nameCtx.companionName]);

  // ===== Dialogue rule engine =====
  function enforceDialogueRules(ctx: {
    i: number;
    dialogue: DialogueLine[];
    hero: string;
    companion: string;
    rival: string;
    city: string;
    childhoodWord: string;
    strength: string;
    lesson: string;
    superpower: string;
    fuel: string;
  }): DialogueLine[] {
    const { i, hero, companion, rival, childhoodWord, strength, city, lesson, superpower, fuel } = ctx;
    let d = (ctx.dialogue || []).slice();

    const hKey = hero.trim().toLowerCase();
    const cKey = companion.trim().toLowerCase();
    const rKey = rival.trim().toLowerCase();

    const isCompanionAllowed = (panelIndex: number) => [1, 2, 4, 6].includes(panelIndex);
    const isRivalAllowed = (panelIndex: number) => [5, 6].includes(panelIndex);

    // Hard rule: Back cover (8) must be silent
    if (i === 8) return [];

    // Normalize: trim empties
    d = d.filter(x => (x.text || '').trim().length > 0);

    // Rival only in 5 & 6
    if (!isRivalAllowed(i)) {
      d = d.filter(x => x.speaker?.trim().toLowerCase() !== rKey);
    }
    // Best friend only in 1, 2, 4, 6
    if (!isCompanionAllowed(i)) {
      d = d.filter(x => x.speaker?.trim().toLowerCase() !== cKey);
    }
    // Panel 7: only hero
    if (i === 7) {
      d = d.filter(x => x.speaker?.trim().toLowerCase() === hKey);
    }

    // Panel 1: hero introduces BF + childhood and limit to one BF line
    if (i === 1) {
      const hasIntro = d.some(x =>
        x.speaker?.trim().toLowerCase() === hKey &&
        new RegExp(`\\b${companion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(x.text || '')
      );
      const hasChildhoodRef = d.some(x =>
        x.speaker?.trim().toLowerCase() === hKey &&
        /(childhood|when we were kids|growing up)/i.test(x.text || '')
      );
      const hasSupport = d.some(x =>
        x.speaker?.trim().toLowerCase() === cKey &&
        /(got you|with you|proud|you.?ve got this|you got this|i.?m here|have your back|got your back)/i.test(x.text || '')
      );

      if (!hasIntro) {
        d.unshift({ speaker: hero, text: `This is ${companion}, my best friend—been here since day one.` });
      }
      if (!hasChildhoodRef) {
        const childLine = stylizeChildhood(childhoodWord);
        d.unshift({ speaker: hero, text: `We grew up through ${childLine}.` });
      }
      if (!hasSupport && isCompanionAllowed(i)) {
        d.push({ speaker: companion, text: `I’m here. You’ve got this.` });
      }

      // keep at most one BF utterance
      let compCount = 0;
      d = d.filter(x => {
        if (x.speaker?.trim().toLowerCase() === cKey) {
          compCount += 1;
          return compCount <= 1;
        }
        return true;
      });
    }

    /* ===== Panel 2 discovery enforcement ===== */
    if (i === 2) {
      const p = (superpower || 'this power').trim();
      const mentionsPower = (txt: string) =>
        new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(txt || '') ||
        /\b(power|ability|abilities)\b/i.test(txt || '');

      const heroHasDiscovery = d.some(x =>
        x.speaker?.trim().toLowerCase() === hKey &&
        mentionsPower(x.text) &&
        /(did i|what|whoa|just|happen|how)/i.test(x.text || '')
      );

      if (!heroHasDiscovery) {
        d.unshift({ speaker: hero, text: discoveryHeroLine(superpower) });
      }

      // Optional one supportive BF reaction line
      const hasBFLine = d.some(x => x.speaker?.trim().toLowerCase() === cKey);
      if (!hasBFLine && isCompanionAllowed(i)) {
        d.push({ speaker: companion, text: `I saw that—was that ${p}?` });
      }

      // cap BF to one utterance
      let compCount2 = 0;
      d = d.filter(x => {
        if (x.speaker?.trim().toLowerCase() === cKey) {
          compCount2 += 1;
          return compCount2 <= 1;
        }
        return true;
      });
    }

    // Panel 3: single narrative caption
    if (i === 3) {
      const cap = trainingCaption(superpower);
      d = [{ speaker: '', text: cap }];
    }

    // Panel 6: ensure hero mentions strength + rival has a losing line
    if (i === 6) {
      const hasStrength = d.some(x =>
        x.speaker?.trim().toLowerCase() === hKey &&
        new RegExp(strength.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(x.text || '')
      );
      if (!hasStrength) {
        d.unshift({ speaker: hero, text: `Time to use my ${strength}.` });
      }
      const hasRivalLine = d.some(x => x.speaker?.trim().toLowerCase() === rKey);
      if (!hasRivalLine) {
        d.push({ speaker: rival, text: losingRivalLine() });
      }
    }

    // Panel 7: hero-only, creative final caption
    if (i === 7) {
      const finalLine = finalPageCaption(city, lesson, fuel, superpower, rival);
      d = [{ speaker: hero, text: finalLine }];
    }

    // Keep bubbles concise everywhere
    d = d.map(x => ({ ...x, text: truncateToTwoSentences(x.text) }));
    return d;
  }

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

      const lines: { speaker?: string; text: string }[] =
        (dialogue || []).map(d => ({
          speaker: (d.speaker || '').trim(),
          text: String(d.text || '').trim()
        })).filter(l => l.text.length > 0);

      if (lines.length > 0) {
        const pad = Math.max(16, Math.round(w * 0.02));
        const lineGap = Math.max(6, Math.round(w * 0.008));
        const fontSize = Math.min(34, Math.max(18, Math.round(w * 0.028)));
        const fontFamily = `"Bangers","Impact","Arial Black","Comic Sans MS","Trebuchet MS",Arial,sans-serif`;
        ctx.font = `400 ${fontSize}px ${fontFamily}`;
        ctx.textBaseline = 'alphabetic';
        ctx.lineJoin = 'round';

        const fixedLabelColors: Record<string, string> = {
          [nameCtx.superheroName.trim().toLowerCase()]: '#FFD700',
          [nameCtx.rivalName.trim().toLowerCase()]: '#FF4500',
          [nameCtx.companionName.trim().toLowerCase()]: '#00BFFF',
        };
        const palette = ['#F5C242','#4DD0E1','#F97316','#22C55E','#EC4899','#A78BFA','#10B981','#60A5FA','#F43F5E','#EAB308'];
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

        const measure = (t: string) => ctx.measureText(t).width;
        const maxTextWidth = w - pad * 2;

        const wrapped: { chunks: { text: string; color: string }[] }[] = [];
        for (const l of lines) {
          const hasLabel = !!l.speaker;
          const label = hasLabel ? `${l.speaker}: ` : '';
          const labelColor = getColorForSpeaker(l.speaker);

        const words = (label + l.text).split(/\s+/);
          let curr = '';
          let firstLine = true;
          let idx = 0;

          while (idx < words.length) {
            const tryWord = words[idx];
            const test = curr ? curr + ' ' + tryWord : tryWord;
            const width = measure(test);

            if (width <= maxTextWidth) {
              curr = test;
              idx++;
            } else {
              const lineText = curr || tryWord;
              let chunks: { text: string; color: string }[] = [];
              if (firstLine && hasLabel) {
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

              curr = '';
              if (lineText === tryWord) idx++;
            }
          }

          if (curr) {
            let chunks: { text: string; color: string }[] = [];
            if (firstLine && hasLabel) {
              if (curr.startsWith(label)) {
                chunks.push({ text: label, color: labelColor });
                chunks.push({ text: curr.slice(label.length), color: '#FFFFFF' });
              } else {
                chunks.push({ text: curr, color: '#FFFFFF' });
              }
            } else {
              chunks.push({ text: curr, color: '#FFFFFF' });
            }
            wrapped.push({ chunks });
          }
        }

        const blockHeight = wrapped.length * (fontSize + lineGap) + pad * 2;

        // Translucent bubble block
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, h - blockHeight, w, blockHeight);

        // Stroke + fill text
        const strokeWidth = Math.max(2, Math.round(fontSize * 0.13));
        ctx.lineWidth = strokeWidth;

        let y = h - blockHeight + pad + fontSize;
        for (const line of wrapped) {
          let x = pad;
          for (const chunk of line.chunks) {
            ctx.strokeStyle = 'rgba(0,0,0,0.95)';
            ctx.strokeText(chunk.text, x, y);
            ctx.fillStyle = chunk.color;
            ctx.fillText(chunk.text, x, y);
            x += measure(chunk.text);
          }
          y += fontSize + lineGap;
        }
      }

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const bin = atob(dataUrl.split(',')[1] || '');
      const buf = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        buf[i] = bin.charCodeAt(i);
      }
      return new Blob([buf], { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  };

  // Prepare composited (with dialogue) URLs for DownloadAllNoZip
  const [preparedOnce, setPreparedOnce] = useState(false);
  const prepareDownloadFiles = async () => {
    if (!panels?.length) return;
    setPreparing(true);
    // revoke old
    objectUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    objectUrlsRef.current = [];

    const heroSlug = (nameCtx.superheroName || 'Hero').replace(/\s+/g, '_');
    const out: { url: string; name: string; ext: 'jpg' }[] = [];

    for (let i = 0; i < panels.length; i++) {
      const p = panels[i];
      if (!p.imageUrl) continue;
      try {
        // For back cover (id 8), pass no dialogue to ensure clean image
        const blob = await renderPanelWithDialogueToJpeg(
          p.imageUrl,
          p.id === 8 ? [] : p.dialogue,
          0.92
        );
        const url = URL.createObjectURL(blob);
        objectUrlsRef.current.push(url);
        const name = `${heroSlug}_panel-${i}`;
        out.push({ url, name, ext: 'jpg' });
        // eslint-disable-next-line no-await-in-loop
        await new Promise(r => setTimeout(r, 60));
      } catch (e) {
        console.warn('Failed preparing panel', i, e);
      }
    }

    setPrepared(out);
    setPreparing(false);
    setPreparedOnce(true);
  };

  // Auto-prepare once generated
  useEffect(() => {
    if (hasGenerated && panels.every(p => p.imageUrl) && !preparedOnce) {
      prepareDownloadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGenerated, panels, preparedOnce]);

  // ===== Cloudinary upload helpers & auto-upload after prepare (silent) =====
  const blobToDataUrl = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  async function uploadToCloudinary(blob: Blob, publicId: string) {
    const base64 = await blobToDataUrl(blob);
    const res = await fetch('/api/cloudinary-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileBase64: base64, publicId, folder: 'comic-exports' }),
    });
    if (!res.ok) throw new Error('Cloudinary upload failed');
    return res.json() as Promise<{ secure_url: string; public_id: string }>;
  }

  useEffect(() => {
    const run = async () => {
      if (!preparedOnce || uploading) return;

      try {
        const coverUrl = localStorage.getItem('coverImageUrl');
        if (!coverUrl) return;

        setUploading(true);
        setCloudinaryLinks([]);
        const heroSlug = (nameCtx.superheroName || 'Hero').replace(/\s+/g, '_');

        const items: { name: string; getBlob: () => Promise<Blob> }[] = [];

        // Upload the raw cover (panel 0 source)
        items.push({
          name: `${heroSlug}_panel-0_cover`,
          getBlob: async () => {
            const r = await fetch(coverUrl);
            return await r.blob();
          }
        });

        // Upload all baked panels (includes back cover without dialogue)
        prepared.forEach((f) => {
          items.push({
            name: f.name, // already heroSlug_panel-#
            getBlob: async () => {
              const r = await fetch(f.url);
              return await r.blob();
            }
          });
        });

        setUploadProgress({ done: 0, total: items.length });
        const links: { name: string; url: string }[] = [];

        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          const blob = await it.getBlob();
          const data = await uploadToCloudinary(blob, it.name);
          links.push({ name: it.name, url: data.secure_url });
          setUploadProgress({ done: i + 1, total: items.length });
          await new Promise(r => setTimeout(r, 80));
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
    if (norm === '') return ''; // keep empty captions empty
    if (['narrator','caption','voiceover'].includes(norm)) return ''; // keep captions unlabeled
    if (['hero','thehero','maincharacter','protagonist'].includes(norm)) return hero;
    if (/(bestfriend|companion|friend|sidekick)/.test(norm)) return companion;
    if (/(rival|villain|enemy|antagonist)/.test(norm)) return rival;
    return s;
  };

  const percent =
    genProgress.total > 0 ? Math.min(100, Math.round((genProgress.i / genProgress.total) * 100)) : 0;

  return (
    <div className="p-4 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center">📖 Your Hero’s Origin Story</h1>
      {error && <p className="text-red-400 text-center">{error}</p>}

      {/* Progress bar while generating */}
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

      {/* (Optional) tiny saving indicator, but no links shown */}
      {uploading && (
        <div className="mx-auto w-full max-w-lg bg-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Saving to Cloudinary…</span>
            <span>{uploadProgress.done}/{uploadProgress.total}</span>
          </div>
          <div className="h-2 w-full bg-white/20 rounded">
            <div
              className="h-2 bg-white rounded transition-all"
              style={{ width: `${Math.round((uploadProgress.done / Math.max(1, uploadProgress.total)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 items-center">
        {panels.map((panel, idx) => {
          const fixedDialogue =
            panel.dialogue?.map(d => {
              const fixedSpeaker = normalizeSpeakerName(d.speaker, nameCtx.superheroName, nameCtx.rivalName, nameCtx.companionName);
              const fixedText = truncateToTwoSentences(
                (d.text || '')
                  .replace(/\bHero\b/gi, nameCtx.superheroName)
                  .replace(/{heroName}/gi, nameCtx.superheroName)
              );
              return { ...d, speaker: fixedSpeaker, text: fixedText };
            }) ?? panel.dialogue;

          return (
            <div
              key={panel.id}
              className="w-full max-w-lg rounded overflow-hidden shadow-lg bg-white text-black"
            >
              {panel.imageUrl ? (
                <ComicPanel
                  imageUrl={panel.imageUrl}
                  dialogue={fixedDialogue}
                  isCover={idx === 0}
                  superheroName={nameCtx.superheroName}
                  rivalName={nameCtx.rivalName}
                  companionName={nameCtx.companionName}
                />
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
        <div className="text-center text-lg text-blue-300">
          {loading ? 'Generating Story Panels…' : 'Preparing downloads…'}
        </div>
      )}

      {panels.length > 0 && !loading && (
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={prepareDownloadFiles}
            disabled={preparing}
            className={`px-5 py-2 rounded font-semibold ${preparing ? 'bg-blue-900 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            {preparing ? 'Preparing…' : (prepared.length ? 'Re-prepare (refresh overlays)' : 'Prepare for Download')}
          </button>

          {prepared.length > 0 && (
            <DownloadAllNoZip
              files={prepared.map((f) => ({ url: f.url, name: f.name, ext: 'jpg' }))}
              baseName={(nameCtx.superheroName || 'comic').replace(/\s+/g, '_')}
              delayMs={350}
            />
          )}

          {/* Removed Cloudinary links list per request */}

          <p className="text-xs text-white/60">
            Tip: “Prepare” bakes speech bubbles into each image.
          </p>
        </div>
      )}
    </div>
  );
}
