// app/api/generate/route.ts

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generateComicImage } from "../../../utils/replicate";

export interface ComicRequest {
  gender: string;
  childhood: string;
  superpower: string;
  city: string;
  fear: string;
  fuel: string;
  strength: string;
  lesson: string;
  selfieUrl: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    const {
      gender,
      childhood,
      superpower,
      city,
      fear,
      fuel,
      strength,
      lesson,
      selfieUrl,
    } = (await req.json()) as ComicRequest;

    if (
      ![gender, childhood, superpower, city, fear, fuel, strength, lesson, selfieUrl].every(Boolean)
    ) {
      return NextResponse.json({ error: "Missing inputs" }, { status: 400 });
    }

    // 1) Generate Hero Name
    const nameRes = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a comic-book editor. Propose a punchy one- or two-word superhero name." },
        {
          role: "user",
          content: `
Gender: ${gender}
Childhood: ${childhood}
Superpower: ${superpower}
Fear: ${fear}
Inspiration: ${fuel}
Strength: ${strength}
Lesson/Tagline: ${lesson}
City: ${city}
          `.trim(),
        },
      ],
      temperature: 0.8,
      max_tokens: 10,
    });
    const rawContent = nameRes.choices[0].message?.content;
    const heroName = rawContent?.trim() ?? "The Hero";

    // 2) Build prompt
    const prompt = `
Create a hyper-realistic 1990s comic-book cover starring ${heroName}.
• Use the provided selfie URL to render the hero’s face exactly—no invented features.
• Show the hero’s full body from head to toe, with both hands and both feet clearly visible, in a dynamic front-facing action pose in a custom superhero costume showcasing the power of ${superpower}.
• Background: a vibrant, ${superpower}-infused skyline of ${city}, styled in bold 90s comic-book colors and lighting.
• Integrate exactly three text elements into the art:
  – The title “${heroName}” at the TOP-LEFT corner (bold, uppercase comic font).
  – “Issue 01” at the TOP-RIGHT corner (smaller comic font).
  – The tagline “${lesson}” in a banner at the BOTTOM-CENTER.
• No other text, logos, speech bubbles, captions, or watermarks—only those three elements.
    `.trim();

    // 3) Generate image
    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    return NextResponse.json({
      comicImageUrl,
      heroName,
      issue: "01",
      tagline: lesson,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ /api/generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
