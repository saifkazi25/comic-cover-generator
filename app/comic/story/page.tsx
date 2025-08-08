'use client';

import { useEffect, useState } from 'react';
import ComicPanel from '../../../components/ComicPanel';

interface ComicRequest {
  gender: string;
  childhood: string;
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
interface Panel {
  id: number;
  prompt?: string;
  imageUrl?: string;
  dialogue?: DialogueLine[];
}

function getRivalName(fear: string) {
  if (!fear) return "Nemesis";
  let clean = fear.replace(/my\s+/i, "").replace(/[^a-zA-Z0-9 ]/g, "");
  if (clean.length < 2) clean = "Shadow";
  if (clean.split(" ").length > 1)
    return "The " + clean
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  return "The " + clean.charAt(0).toUpperCase() + clean.slice(1);
}

/** ---------- New helpers for scary rival name ---------- */
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
  const cleaned = raw.replace(/my\s+/i, "").replace(/[^a-zA-Z0-9\s\-]/g, " ").replace(/\s+/g, " ").trim();
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
  const pick = pool[Math.floor(Math.random() * pool.length)];
  localStorage.setItem('companionName', pick);
  return pick;
}

/** 🔧 Normalize speaker names right before rendering (last-resort fix) */
function normalizeSpeakerName(
  speakerRaw: string,
  hero: string,
  rival: string,
  companion: string
) {
  const s = String(speakerRaw || '').trim();
  const norm = s.toLowerCase().replace(/[^a-z]/g, '');
  if (['hero','thehero','maincharacter','protagonist','narrator','caption','voiceover'].includes(norm)) return hero;
  if (/(bestfriend|companion|friend|sidekick)/.test(norm)) return companion;
  if (/(rival|villain|enemy|antagonist)/.test(norm)) return rival;
  return s; // already a proper name
}

/**
 * Convert abstract fears/concepts into a vivid monster/being description
 * without changing anything else in your flow.
 */
function fearToCreature(fearRaw: string): string {
  const fear = (fearRaw || '').toLowerCase().trim();

  // Common mappings for better visuals
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

  // Generic fallback
  if (!fear) {
    return 'a faceless void knight woven from stormclouds and static';
  }
  return `a monstrous embodiment of "${fearRaw}", visualized as a fearsome creature or supernatural being in full detail`;
}

export default function ComicStoryPage() {
  const [inputs, setInputs] = useState<ComicRequest | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    try {
      const rawInputs = localStorage.getItem('comicInputs');
      const coverImageUrl = localStorage.getItem('coverImageUrl');
      if (!rawInputs || !coverImageUrl) {
        setError('Missing comic inputs or cover image. Please go back and try again.');
        return;
      }
      const parsed: ComicRequest = JSON.parse(rawInputs);

      // ✅ Read hero name from anywhere we might have stored it
      const storedHeroName =
        localStorage.getItem('heroName') ||
        localStorage.getItem('superheroName') ||
        (parsed as any).superheroName ||
        "Hero";

      setInputs({ ...parsed, selfieUrl: parsed.selfieUrl, superheroName: storedHeroName });

      // NEW: build a rival creature description from abstract fear
      const rivalCreature = fearToCreature(parsed.fear);

      // --- UPDATED PROMPTS ---
      const storyBeats: Panel[] = [
        { id: 0, imageUrl: coverImageUrl }, // Cover

        {
          id: 1,
          prompt: `A golden flashback. The hero as a child—a de-aged version with facial features and hair that are an *identical, unmistakable match to the cover image*—sits sideways on old playground equipment in ordinary childhood clothes, clutching a memento representing "${parsed.childhood}". Best Friend is nearby, offering silent support. The background is a faded corner of ${parsed.city}: cracked pavement and playground shadows. Absolutely no superhero costume. The child’s face and hair are identical to the cover, just younger. Cinematic, 80s comic art like other panels, no text.`
        },
        {
          id: 2,
          prompt: `On a bright afternoon in ${parsed.city}, the hero stands in a lively city park. IMPORTANT: The hero must be wearing ONLY regular, modern human clothes, such as jeans and a t-shirt—no superhero costume, no mask, no cape, no gloves. Absolutely do NOT include any superhero outfit. Their face and hair must be an *identical, photorealistic, slightly younger match to the cover image*—no artistic license, must be unmistakably the same person. Families relax on picnic blankets. Children play in the distance. Suddenly, ${parsed.superpower} bursts to life for the first time. ${parsed.superpower} swirl through the grass, lifting kites and scattering flower petals. The hero is shown in a dramatic three-quarters pose, awe and surprise on their face. Best Friend peeks from behind a park bench, eyes wide. The rival watches from the shade of a tree, half-hidden. No front-facing pose. Absolutely NO superhero costume—repeat: no superhero outfit at all. 1980s comic art, no text.`
        },
        // ---- Training panel ----
        {
          id: 3,
          prompt: `Training montage: The hero is completely alone, in dramatic profile (not facing the camera). The hero must be wearing ONLY modern, stylish training clothes or athletic sportswear—such as track pants, running shoes, tank top, or gym t-shirt—NO superhero suit, NO cape, NO mask, NO gloves, NO comic outfit, NO superhero costume whatsoever. Absolutely forbid any superhero attire. The hero’s face and hair must EXACTLY match the cover image—photorealistic, no creative liberty. Show the hero in a powerful, dynamic athletic pose: sprinting, leaping, striking, or controlling ${parsed.superpower} with intense effort and sweat. The training setting is high-energy: think rooftop at dusk, a neon-lit gym, or a windy open field, with dramatic clouds and swirling energy effects around the hero. No other characters present. Cinematic, iconic, visually powerful 1980s comic art, no text.`
        },
        // ---- Mastery/humorous suit panel ----
        {
          id: 4,
          prompt: `The hero, whose face and hair are an *identical match to the cover image*, wears their hero suit for the very first time. The scene is at dusk on a rooftop or iconic spot in ${parsed.city} with best friend their in admiration. Make the hero’s pose or expression a little playful, humorous, or cheeky—admiring their new suit, striking a silly or show-off pose, flexing, or giving a thumbs up. Their powers swirl confidently around them. Awed. 80s comic art, no text.`
        },
        {
          id: 5,
          prompt: `In a rain-soaked alley, the hero stands face-to-face with the rival—who now embodies ${rivalCreature}. Both are shown in profile or dramatic three-quarters view, inches apart, tension crackling. The hero’s face, hair, and superhero costume must *match the cover image exactly*—no artistic liberty. Fear is written in every feature—trembling hands, sweat, clenched jaw. The alley is lined with glowing signs, puddles reflecting twisted shapes. Best Friend is distant, blurred. No backs to camera. Pure confrontation, psychological drama, 80s comic art, no text.`
        },
        {
          id: 6,
          prompt: `In the middle of a bustling street or open plaza in ${parsed.city}, surrounded by amazed pedestrians, the hero unleashes the full force of ${parsed.strength} to finally overcome the rival, who embodies ${rivalCreature}. The hero’s face, hair, and superhero costume are an *identical match to the cover image*—no creative liberty. In a dynamic side pose—not facing forward—the hero sends the rival tumbling into swirling shadows, broken symbols of "${parsed.fear}" scattering across the pavement. Best Friend cheers from the crowd, arms raised. Local city details: street signs, market stalls, banners. Dramatic, hopeful, energetic 80s comic art, no text.`
        },
        {
          id: 7,
          prompt: `At dawn, the hero sits or stands sideways atop a building ledge in ${parsed.city}, cape fluttering, hands resting on knees or arms folded, gazing out over the waking city. The hero’s face, hair, and superhero costume are an *identical match to the cover image*—no artistic liberty. The pose is calm, reflective, never facing the viewer. The skyline is detailed with local landmarks. The hero’s lesson "${parsed.lesson}" is felt in posture and the peaceful golden light. The rival and Best Friend are absent; the hero is alone. Cinematic, iconic, 80s comic art, no text.`
        }
      ];

      setPanels(storyBeats);
      console.log('[ComicStoryPage] Panels set:', storyBeats);
    } catch (err) {
      setError('Invalid or corrupted data. Please restart.');
      console.error('[ComicStoryPage] Error parsing inputs:', err);
    }
  }, []);

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

      const superheroName = inputs.superheroName || "Hero";
      const rivalName = autoRivalNameFromFear(inputs.fear); // scary + de-article
      const companionName = getOrSetCompanionName();

      try {
        const generatedPanels: Panel[] = [{ ...panels[0], imageUrl: coverImageUrl }];

        for (let i = 1; i < panels.length; i++) {
          const panel = panels[i];

          // 1. Generate image
          const imgRes = await fetch('/api/generate-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: panel.prompt,
              inputImageUrl: coverImageUrl,
            }),
          });
          const imgJson = await imgRes.json();

          // 2. Generate dialogue
          let dialogue: DialogueLine[] = [];
          try {
            const dlgRes = await fetch('/api/generate-dialogue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                panelPrompt: panel.prompt,
                panelIndex: i, // introduce companion ONLY at panel 2
                userInputs: {
                  ...inputs,
                  superheroName,
                  rivalName,       // send strong rival name
                  companionName    // persistent, gender-neutral
                },
              }),
            });
            const dlgJson = await dlgRes.json();

            // Safety map with trim + case-normalize
            dialogue = (dlgJson.dialogue || []).map((d: any) => {
              let speaker = String(d.speaker || "").trim();
              if (/^hero$/i.test(speaker)) speaker = superheroName;
              else if (/^(best\s*friend|companion)$/i.test(speaker)) speaker = companionName;
              else if (/^rival$/i.test(speaker)) speaker = rivalName;
              return { ...d, speaker };
            });
          } catch (dlgErr) {
            dialogue = [{ speaker: superheroName, text: "..." }];
            console.error(`[ComicStoryPage] Error generating dialogue for panel ${i}:`, dlgErr);
          }

          generatedPanels.push({
            ...panel,
            imageUrl: imgJson.comicImageUrl,
            dialogue,
          });
          console.log(`[ComicStoryPage] Panel ${i} generated:`, {
            image: imgJson.comicImageUrl,
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

    if (
      panels.length > 1 &&
      panels[0].imageUrl &&
      !panels[1]?.imageUrl &&
      !hasGenerated
    ) {
      autoGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, panels, hasGenerated]);

  const superheroName = inputs?.superheroName || "Hero";
  const rivalName = inputs ? autoRivalNameFromFear(inputs.fear) : "Rival"; // display name
  const companionName = getOrSetCompanionName();

  return (
    <div className="p-4 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center">📖 Your Hero’s Origin Story</h1>
      {error && <p className="text-red-400 text-center">{error}</p>}
      
      <div className="flex flex-col gap-6 items-center">
        {panels.map((panel, idx) => {
          const fixedDialogue =
            panel.dialogue?.map(d => ({
              ...d,
              speaker: normalizeSpeakerName(d.speaker, superheroName, rivalName, companionName)
            })) ?? panel.dialogue;

          return (
            <div
              key={panel.id}
              className="w-full max-w-lg rounded overflow-hidden shadow-lg bg-white text-black"
            >
              {panel.imageUrl ? (
                <ComicPanel
                  imageUrl={panel.imageUrl}
                  dialogue={fixedDialogue}  {/* ✅ enforce hero name at render */}
                  isCover={idx === 0}
                  superheroName={superheroName}
                  rivalName={rivalName}
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
      
      {loading && (
        <div className="text-center text-lg text-blue-300">Generating Story Panels…</div>
      )}
    </div>
  );
}
