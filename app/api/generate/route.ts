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

    if (![gender, childhood, superpower, city, fear, fuel, strength, lesson, selfieUrl].every(Boolean)) {
      return NextResponse.json({ error: "Missing inputs" }, { status: 400 });
    }

    // 1) Hero name
    const nameRes = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a comic-book editor. Propose a punchy one- or two-word superhero name." },
        {
          role: "user",
          content: `
Gender: ${gender}
Superpower: ${superpower}
City: ${city}
Lesson/Tagline: ${lesson}
          `.trim(),
        },
      ],
      temperature: 0.8,
      max_tokens: 10,
    });
    const raw = nameRes.choices[0].message?.content;
    const heroName = raw?.trim() ?? "The Hero";

    // 2) AI prompt
    const prompt = `
Create a hyper-realistic 1990s comic-book cover of ${heroName}.
• Use the selfie URL only for the face—discard all clothing.
• Show the hero’s full body (head-to-toe, hands & feet visible) in a powerful front-facing pose that highlights their ${superpower}.
• Design a completely original costume—no red trunks, no S-shields, no boot/cape combos, no Superman references whatsoever.
• Place exactly three text elements in the art:
   – “${heroName}” at the TOP-LEFT in bold, uppercase comic type.
   – “Issue 01” at the TOP-RIGHT in smaller comic type.
   – “${lesson}” in a banner at the BOTTOM-CENTER.
• Background: the ${city} skyline infused with energetic ${superpower} effects in vivid 90s colors.
• No other text, logos, speech bubbles, or watermarks.
`.trim();

    // 3) Generate image
    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    // 4) Respond
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
