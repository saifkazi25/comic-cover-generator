import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ----- Helpers -----
function titleCase(s: string) {
  return s
    .split(" ")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Auto-generate a stylish rival name from fear
function autoRivalNameFromFear(fearRaw: string) {
  const fear = (fearRaw || "").toLowerCase().trim();

  if (!fear) return "The Nemesis";
  if (/(height|vertigo|fall)/.test(fear)) return "Lord Vertigo";
  if (/(failure|not good enough|waste|potential|loser)/.test(fear)) return "The Dreadwraith";
  if (/(rejection|abandon|alone|lonely)/.test(fear)) return "Echo Null";
  if (/(dark|night)/.test(fear)) return "Nightveil";
  if (/(spider|insect|bug)/.test(fear)) return "Iron Widow";
  if (/(snake|serpent)/.test(fear)) return "Neon Seraphis";
  if (/(public speaking|stage|crowd)/.test(fear)) return "Many-Mouth";
  if (/(death|mortality)/.test(fear)) return "King Thanix";
  if (/dementor/.test(fear)) return "The Dreadmonger";

  const cleaned = fearRaw.replace(/my\s+/i, "").replace(/[^a-zA-Z0-9 ]/g, "").trim();
  if (!cleaned) return "The Nemesis";
  if (cleaned.split(" ").length > 1) return "The " + titleCase(cleaned);
  return "The " + titleCase(cleaned);
}

// Turn abstract fear into a creature description
function fearToCreature(fearRaw: string): string {
  const fear = (fearRaw || '').toLowerCase().trim();

  if (/(height|fall|vertigo)/.test(fear))
    return 'a towering cliff-golem of crumbling rock and steel girders, howling wind swirling around it';
  if (/(failure|loser|not good enough|waste|potential)/.test(fear))
    return 'a shadow wraith stitched with torn report cards and shattered trophies, faces of doubt flickering across its surface';
  if (/(rejection|abandon|lonely|alone)/.test(fear))
    return 'a hollow-eyed banshee made of cracked mirrors, every reflection turning away';
  if (/(dark|night)/.test(fear))
    return 'an ink-black smoke serpent with glowing ember eyes, swallowing streetlights as it moves';
  if (/(spider|insect|bug)/.test(fear))
    return 'a chittering iron-backed arachnid the size of a car, cables and wires for legs';
  if (/(snake|serpent)/.test(fear))
    return 'a neon-scaled serpent coiled around rusted scaffolding, fangs dripping fluorescent venom';
  if (/(public speaking|stage|crowd)/.test(fear))
    return 'a many-mouthed herald made of microphones and tangled cables, voices booming from every direction';
  if (/(death|mortality)/.test(fear))
    return 'a skeletal monarch in a cloak of falling clock-hands, each tick cutting the air';

  if (!fear) return 'a faceless void knight woven from stormclouds and static';
  return `a monstrous embodiment of "${fearRaw}", visualized as a fearsome creature or supernatural being in full detail`;
}

// Gender-neutral companion names
const COMPANION_POOL = [
  "Alex","Sam","Jordan","Casey","Taylor","Morgan",
  "Riley","Jamie","Avery","Cameron","Quinn","Rowan",
  "Skyler","Elliot","Harper","Reese","Drew","Sage",
  "Parker","Blair"
];

function pickCompanionName(seed?: string) {
  if (seed && typeof seed === "string" && seed.trim()) return seed.trim();
  const n = Math.floor(Math.random() * COMPANION_POOL.length);
  return COMPANION_POOL[n];
}

// ---- NEW: enforce 1–2 sentences per bubble (server-side safety) ----
function truncateToTwoSentences(text: string): string {
  const t = String(text || "").trim();
  if (!t) return t;
  const parts = t.split(/(?<=[.!?])\s+/);
  return parts.slice(0, 2).join(" ");
}

// ---------------------------------------------

export async function POST(req: Request) {
  try {
    const { panelPrompt, userInputs, panelIndex } = await req.json();

    // ✅ Use hero name from inputs or fallback
    const superheroName: string = userInputs?.superheroName?.trim() || "Hero";

    // ✅ Auto-generate rival if missing
    let rivalName: string = userInputs?.rivalName?.trim() || autoRivalNameFromFear(userInputs?.fear || "");

    // ✅ Pick companion name
    const companionName = pickCompanionName(userInputs?.companionName);

    const rivalCreature = fearToCreature(userInputs?.fear || "");

    console.log("🟦 Dialogue API → Panel:", panelIndex);
    console.log("🟦 Superhero:", superheroName);
    console.log("🟦 Rival:", rivalName);
    console.log("🟦 Companion:", companionName);

    // Panel-specific constraints
    const isPanel2 = Number(panelIndex) === 2; // subtle companion intro/support (handled upstream too)
    const isPanel6 = Number(panelIndex) === 6; // rival is losing (weakened tone)

    const system = `
You are a comic book writer. Return ONLY valid JSON.

GLOBAL RULES:
- Use EXACT speaker names: "${superheroName}", "${companionName}", "${rivalName}".
- Keep EACH dialogue bubble to MAX 1–2 sentences. No monologues.
- Prefer 1–3 total bubbles for the scene, punchy and cinematic.
- The rival "${rivalName}" is ${rivalCreature}.

PANEL RULES:
${isPanel2 ? `- Panel 2: Naturally introduce ${companionName} before they speak; their line should be supportive.` : `- Do NOT (re)introduce ${companionName}.`}
${isPanel6 ? `- Panel 6: The rival is LOSING. If "${rivalName}" speaks, it should sound weakened, fragmented, or desperate (short phrases). The hero’s tone is decisive, reflecting strength.` : ''}

OUTPUT:
- JSON array only. Example:
  [{"text":"...","speaker":"${superheroName}"}]
`;

    const user = `
Hero Inputs: ${JSON.stringify({ ...userInputs, superheroName, rivalName, companionName })}
Scene: ${panelPrompt}
`;

    const chatRes = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    });

    const raw = chatRes.choices[0]?.message?.content || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    let dialogue: Array<{ text: string; speaker: string }> = [];

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        // 🔒 Enforce 1–2 sentences per bubble server-side
        dialogue = Array.isArray(parsed)
          ? parsed
              .map((d) => ({
                text: truncateToTwoSentences(d?.text ?? ""),
                speaker: String(d?.speaker ?? "").trim()
              }))
              .filter((d) => d.text && d.speaker)
          : [{ text: "…", speaker: superheroName }];
      } catch {
        dialogue = [{ text: "…", speaker: superheroName }];
      }
    } else {
      dialogue = [{ text: "…", speaker: superheroName }];
    }

    return NextResponse.json({
      dialogue,
      names: { superheroName, rivalName, companionName },
      raw
    });
  } catch (err) {
    console.error("❌ OpenAI Dialogue Error", err);
    return NextResponse.json({ error: "Failed to generate dialogue" }, { status: 500 });
  }
}
