import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

/**
 * Convert abstract fears/concepts into a vivid monster/being description
 */
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

  if (!fear) {
    return 'a faceless void knight woven from stormclouds and static';
  }
  return `a monstrous embodiment of "${fearRaw}", visualized as a fearsome creature or supernatural being in full detail`;
}

export async function POST(req: Request) {
  try {
    const { panelPrompt, userInputs } = await req.json();

    // Hero name
    const superheroName = userInputs?.superheroName || "Hero";

    // Rival name (same as before)
    const rivalName = userInputs?.rivalName || "Rival";

    // Rival creature description from fear
    const rivalCreature = fearToCreature(userInputs?.fear || "");

    console.log("🟦 [Dialogue API] Input panelPrompt:", panelPrompt);
    console.log("🟦 [Dialogue API] Input userInputs:", userInputs);
    console.log("🟦 [Dialogue API] Rival creature:", rivalCreature);

    const system = `
You are a comic book writer.
Given a panel's scene description and the hero's background, write 1-2 short, emotional comic-style lines for dialogue or narration.
- Use "${superheroName}" for the hero, "Best Friend" for the sidekick/supporting character.
- The rival is "${rivalName}", who is ${rivalCreature}.
- Match the mood of the scene and keep it natural, without long paragraphs.
- Always return your response as a JSON array, each entry is an object: { "text": "...", "speaker": "${superheroName}"|"Best Friend"|"${rivalName}" }.
Do not invent other speakers.
`;

    const user = `
Hero's details: ${JSON.stringify(userInputs)}
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

    const match = chatRes.choices[0]?.message?.content?.match(/\[[\s\S]*\]/);
    let dialogue = [];
    if (match) {
      dialogue = JSON.parse(match[0]);
    } else {
      dialogue = [
        { text: "No dialogue generated. (Edit me!)", speaker: superheroName }
      ];
    }

    console.log("🟩 [Dialogue API] OpenAI output:", chatRes.choices[0]?.message?.content);
    console.log("🟩 [Dialogue API] Parsed dialogue array:", dialogue);

    return NextResponse.json({ dialogue, raw: chatRes.choices[0]?.message?.content });
  } catch (err) {
    console.error("❌ OpenAI Dialogue Error", err);
    return NextResponse.json({ error: "Failed to generate dialogue" }, { status: 500 });
  }
}
