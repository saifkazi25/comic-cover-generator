import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Rival name generator based on fear
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

// Random best friend name generator
function getRandomBestFriendName() {
  const names = [
    "Alex", "Sam", "Jordan", "Casey", "Taylor", "Morgan",
    "Riley", "Jamie", "Avery", "Cameron", "Quinn", "Rowan",
    "Skyler", "Elliot", "Harper"
  ];
  return names[Math.floor(Math.random() * names.length)];
}

// Global variable to persist Best Friend name for the session
let persistentBestFriendName: string | null = null;

export async function POST(req: Request) {
  try {
    const { panelPrompt, userInputs } = await req.json();

    // 1. Superhero name from inputs
    const superheroName = userInputs?.superheroName?.trim() || "Hero";

    // 2. Rival name auto-generated from fear
    const rivalName = getRivalName(userInputs?.fear || "");

    // 3. Best Friend name: generate once and persist
    if (!persistentBestFriendName) {
      persistentBestFriendName = getRandomBestFriendName();
    }

    console.log("🟦 [Dialogue API] Superhero name:", superheroName);
    console.log("🟦 [Dialogue API] Rival name:", rivalName);
    console.log("🟦 [Dialogue API] Best Friend name:", persistentBestFriendName);

    // Check if this is panel 2 (introduction panel)
    const isIntroductionPanel =
      panelPrompt && panelPrompt.toLowerCase().includes("best friend peeks");

    // System prompt for the model
    const system = `
You are a comic book writer.
Given a panel's scene description and the hero's background, write 1-2 short, emotional comic-style lines for dialogue or narration.
- Always use "${superheroName}" for the hero.
- Always use "${rivalName}" for the rival.
- Always use "${persistentBestFriendName}" for the Best Friend after it is introduced.
- If this is the introduction panel for the Best Friend (${isIntroductionPanel ? "YES" : "NO"}), have the hero or narration introduce them naturally by name (e.g., "This is ${persistentBestFriendName}, my oldest friend.").
- Avoid long paragraphs, keep it natural, and match the mood of the scene.
- Always return your response as a JSON array, each entry is an object: { "text": "...", "speaker": "${superheroName}"|"${persistentBestFriendName}"|"${rivalName}" }.
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

    return NextResponse.json({
      dialogue,
      bestFriendName: persistentBestFriendName,
      raw: chatRes.choices[0]?.message?.content
    });
  } catch (err) {
    console.error("❌ OpenAI Dialogue Error", err);
    return NextResponse.json(
      { error: "Failed to generate dialogue" },
      { status: 500 }
    );
  }
}
