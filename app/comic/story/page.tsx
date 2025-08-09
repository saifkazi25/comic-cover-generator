'use client';

import { useEffect, useRef, useState } from 'react';
import ComicPanel from '../../../components/ComicPanel';
import DownloadAllNoZip from '../../../components/DownloadAllNoZip';

interface ComicRequest {
  gender: string;
  childhood: string;
  superpower: string;
  city: string;
  fear: string;      // “Your enemy is the embodiment of your deepest fear. What form does it take?”
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

/* ===================== Fear → visual design ===================== */
function fearToCreature(fearRaw: string): string {
  const fear = (fearRaw || '').toLowerCase().trim();

  if (/(height|fall|vertigo)/.test(fear)) {
    return 'a towering cliff-golem of crumbling rock and steel girders, howling wind swirling around it';
  }
  if (/(failure|loser|not good enough|waste|potential)/.test(fear)) {
    return 'a shadow wraith stitched with torn report cards and shattered trophies, faces of doubt flickering across its surface';
  }
  if (/(rejection|abandon|lonely|alone)/.test(fear)) {
    return 'a hollow-eyed banshee made of cracked mirrors, every reflection turning away';
  }
  if (/(dark|night)/.test(fear)) {
    return 'an ink-black smoke serpent with glowing ember eyes, swallowing streetlights as it moves';
  }
  if (/(spider|insect|bug)/.test(fear)) {
    return 'a chittering iron-backed arachnid the size of a car, cables and wires for legs';
  }
  if (/(snake|serpent)/.test(fear)) {
    return 'a neon-scaled serpent coiled around rusted scaffolding, fangs dripping fluorescent venom';
  }
  if (/(public speaking|stage|crowd)/.test(fear)) {
    return 'a many-mouthed herald made of microphones and tangled cables, voices booming from every direction';
  }
  if (/(death|mortality)/.test(fear)) {
    return 'a skeletal monarch in a cloak of falling clock-hands, each tick cutting the air';
  }
  if (/(failure to protect|family|loved ones)/.test(fear)) {
    return 'a guardian-golem gone rogue, its armor plated with broken family photos';
  }

  if (!fear) return 'a faceless void knight woven from stormclouds and static';
  return `a monstrous embodiment of "${fearRaw}", visualized as a fearsome creature or supernatural being in full detail`;
}

function buildRivalDesign(fearRaw: string) {
  const base = fearToCreature(fearRaw);
  const h = hashStr((fearRaw || '').toLowerCase().trim());

  const palettes = [
    'coal black + ember orange + ash gray',
    'ultraviolet + toxic green + chrome',
    'rust red + oil slick blue + bone white',
    'neon cyan + magenta glow + graphite',
    'sandstone beige + obsidian + eclipse purple'
  ];
  const eyeStyles = [
    'hollow sockets glowing with ringed light',
    'compound eyes with rotating pupils',
    'single cyclopean iris that dilates like a camera aperture',
    'many slit-pupiled eyes blinking asynchronously',
    'empty eye-plates that project symbols into the air'
  ];
  const mouthStyles = [
    'tessellated jaws that unfold in segments',
    'glass teeth that chime when it growls',
    'a seam that splits open vertically',
    'a speaker-grille maw that booms sub-bass',
    'mandibles that interlock like clockwork'
  ];
  const motionStyles = [
    'glides with low friction, leaving a shimmer trail',
    'moves in abrupt stutters, skipping frames',
    'coils and uncoils rhythmically like a machine spring',
    'pivots on limb-anchors, dragging cables',
    'flows like smoke that occasionally snaps solid'
  ];
  const scale = [
    'two heads taller than the hero',
    'massive, filling half the frame',
    'lean but towering with elongated limbs',
    'stocky and dense, like compacted metal',
    'whip-thin with exaggerated reach'
  ];
  const weakSigils = [
    'a faint sigil of the hero’s fear flickers on its chest',
    'hairline cracks radiate from a heart-shaped core',
    'a glowing seam along the ribs pulses with each breath',
    'runes fade in and out along its spine',
    'a crown-like halo fractures whenever it’s struck'
  ];

  const pick = (arr: string[]) => arr[h % arr.length];

  return {
    base,
    palette: pick(palettes),
    eyes: pick(eyeStyles),
    mouth: pick(mouthStyles),
    motion: pick(motionStyles),
    scale: pick(scale),
    weakPoint: pick(weakSigils),
    seed: h
  };
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

  // Prepared files for DownloadAllNoZip (dialogue baked in)
  const [prepared, setPrepared] = useState<{ url: string; name: string; ext: 'jpg' }[]>([]);
  const [preparing, setPreparing] = useState(false);
  const objectUrlsRef = useRef<string[]>([]); // revoke on unmount

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

      // Build rival spec from fear for the prompts below
      const rivalDesign = buildRivalDesign(parsed.fear);
      const RIVAL_SPEC_BLOCK =
`RIVAL DESIGN SPEC (must match EXACTLY in every panel):
- Core concept: ${rivalDesign.base}
- Color palette: ${rivalDesign.palette}
- Eyes: ${rivalDesign.eyes}
- Mouth: ${rivalDesign.mouth}
- Motion: ${rivalDesign.motion}
- Scale: ${rivalDesign.scale}
- Weak-point motif: ${rivalDesign.weakPoint}
Rules: The rival must look IDENTICAL across panels: same silhouette, limb count, materials, face/eye/mouth geometry, colors, and motifs. Do NOT redesign or re-style it.`;

      // 🔧 NEW: short, reusable hero identity lock (EXACT as supplied)
      const HERO_LOCK =
`HERO MUST MATCH COVER EXACTLY: same human face and hair, same hero suit; normal human anatomy (no scales, claws, fangs, or extra limbs); do NOT transform the hero.`;

      // === Your requested storyBeats block (unchanged) ===
      const storyBeats: Panel[] = [
        { id: 0, imageUrl: coverImageUrl }, // Cover

        {
          id: 1,
          prompt: `A golden flashback. The hero as a child—a de-aged version with facial features and hair that are an *identical, unmistakable match to the cover image*—sits sideways on old playground equipment in ordinary childhood clothes, clutching a picture representing "${parsed.childhood}". Best Friend (always opposite gender of hero) is nearby, offering silent support. The background is a faded corner of ${parsed.city}: cracked pavement and playground shadows. Absolutely no superhero costume. The child’s face and hair are identical to the cover, just younger. Cinematic, 80s comic art like other panels, no text.`
        },
        {
          id: 2,
          prompt: `On a bright afternoon in ${parsed.city}, the hero stands in a lively city park. IMPORTANT: The hero must be wearing ONLY regular, modern human clothes—no superhero costume. Their face and hair must be an *identical, photorealistic, slightly younger match to the cover image*. Families relax on picnic blankets. Children play in the distance. Suddenly, ${parsed.superpower} bursts to life for the first time, scattering petals. Best Friend peeks from behind a bench; the rival watches from the shade. 1980s comic art, no text.`
        },
        {
          id: 3,
          prompt: `Training montage: The hero alone, dramatic profile (not facing camera). Hero is in training clothes with jumper and training shoes. Exact face & hair match to cover. Show dynamic athletic pose controlling ${parsed.superpower}. High-energy setting (rooftop at dusk / neon-lit gym / windy field). 80s comic art, no text.`
        },
        {
          id: 4,
          prompt: `First suit moment: dusk rooftop in ${parsed.city}. Hero’s face/hair EXACTLY match cover in a triumph pose with ${parsed.superpower} unleashed. Best Friend (always the opposite gender) present in regular clothes in admiration. Pose playful/cheeky. Powers swirl with confidence. 80s comic art, no text.`
        },
        {
          id: 5,
          // Short + strict: hero stays human; one consistent rival only
          prompt: `Rain-soaked alley at night. ${HERO_LOCK} Hero faces a single rival in tight side profile, inches apart. ${RIVAL_SPEC_BLOCK} One rival only; design unchanged. 80s comic art, no text.`
        },
        {
          id: 6,
          // Short + strict: rival losing; hero identity locked
          prompt: `In the middle of a bustling street or open plaza in ${parsed.city}, surrounded by amazed pedestrians, the hero unleashes the full force of ${parsed.strength} to finally overcome the rival, who embodies ${parsed.fear}. The hero’s face, hair, & superhero costume are an *identical match to the cover image*—no creative liberty. In a dynamic side pose—not facing forward—the hero sends the rival tumbling into swirling shadows, broken symbols of "${parsed.fear}" scattering across the pavement. Best Friend (always the opposite gender) cheers from the crowd, arms raised. Local city details: street signs, market stalls, banners. No Logos. Dramatic, hopeful, energetic 80s comic art, no text.`
        },
        {
          id: 7,
          prompt: `Dawn. The hero sits/stands sideways atop a ledge in ${parsed.city} looking into the horizon, reflective pose with cape flying. Exact face/hair/suit match to cover. Skyline with local landmarks. The lesson "${parsed.lesson}" is felt in posture and golden light. Alone, no other characters. 80s comic art, no text.`
        }
      ];

      // Persist a deterministic seed for rival (optional for backend)
      localStorage.setItem('rivalSeed', String(rivalDesign.seed));

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

  // === Generation flow (images + dialogue) ===
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

      try {
        const generatedPanels: Panel[] = [{ ...panels[0], imageUrl: coverImageUrl }];

        for (let i = 1; i < panels.length; i++) {
          const panel = panels[i];

          // 1) Generate image
          const imgRes = await fetch('/api/generate-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: panel.prompt,
              inputImageUrl: coverImageUrl,
              seed: Number(localStorage.getItem('rivalSeed') || hashStr(inputs.fear || ''))
            }),
          });
          const imgJson = await imgRes.json();

          // 2) Generate dialogue
          let dialogue: DialogueLine[] = [];
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

          generatedPanels.push({
            ...panel,
            imageUrl: imgJson.comicImageUrl,
            dialogue,
          });
        }

        setPanels(generatedPanels);
        setHasGenerated(true);
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
          const label = l.speaker ? `${l.speaker}: ` : '';
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
              if (firstLine && label) {
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
            if (firstLine && label) {
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
      for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      return new Blob([buf], { type: 'image/jpeg' });
    } finally {
      URL.revokeObjectURL(objUrl);
    }
  };

  // Prepare composited (with dialogue) URLs for DownloadAllNoZip
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
        const blob = await renderPanelWithDialogueToJpeg(p.imageUrl, p.dialogue, 0.92);
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
  };

  // Auto-prepare once generated
  useEffect(() => {
    if (hasGenerated && panels.every(p => p.imageUrl)) {
      prepareDownloadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGenerated, panels]);

  const normalizeSpeakerName = (speakerRaw: string, hero: string, rival: string, companion: string) => {
    const s = String(speakerRaw || '').trim();
    const norm = s.toLowerCase().replace(/[^a-z]/g, '');
    if (['hero','thehero','maincharacter','protagonist','narrator','caption','voiceover'].includes(norm)) return hero;
    if (/(bestfriend|companion|friend|sidekick)/.test(norm)) return companion;
    if (/(rival|villain|enemy|antagonist)/.test(norm)) return rival;
    return s;
  };

  return (
    <div className="p-4 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center">📖 Your Hero’s Origin Story</h1>
      {error && <p className="text-red-400 text-center">{error}</p>}

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
            className={`px-5 py-2 rounded font-semibold ${
              preparing ? 'bg-blue-900 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {preparing ? 'Preparing…' : (prepared.length ? 'Re-prepare (refresh overlays)' : 'Prepare for Download')}
          </button>

          {prepared.length > 0 && (
            <DownloadAllNoZip
              files={prepared.map((f) => ({ url: f.url, name: f.name, ext: f.ext }))}
              baseName={(nameCtx.superheroName || 'comic').replace(/\s+/g, '_')}
              delayMs={350}
            />
          )}

          <p className="text-xs text-white/60">
            Tip: “Prepare” bakes speech bubbles into each image, then “Download All” saves them (no ZIP).
          </p>
        </div>
      )}
    </div>
  );
}
