import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const { panelPrompt, userInputs } = await req.json();

    console.log("🟦 [Dialogue API] Input panelPrompt:", panelPrompt);
    console.log("🟦 [Dialogue API] Input userInputs:", userInputs);

    const system = `
You are a comic book writer. 
Given a panel's scene description and the hero's background, write 1-2 short, emotional comic-style lines for dialogue or narration. 
Avoid long paragraphs, keep it natural, and match the mood of the scene. 
Always return your response as a JSON array, each entry is an object: { "text": "...", "speaker": "hero"|"companion"|"rival" }.
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

    // Parse LLM output as JSON array
    const match = chatRes.choices[0]?.message?.content?.match(/\[[\s\S]*\]/);
    let dialogue = [];
    if (match) {
      dialogue = JSON.parse(match[0]);
    } else {
      dialogue = [
        { text: "No dialogue generated. (Edit me!)", speaker: "hero" }
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
