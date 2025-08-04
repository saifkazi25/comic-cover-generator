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
    // 0) Parse + validate
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
      ![
        gender,
        childhood,
        superpower,
        city,
        fear,
        fuel,
        strength,
        lesson,
        selfieUrl,
      ].every(Boolean)
    ) {
      return NextResponse.json({ error: "Missing inputs" }, { status: 400 });
    }

    // 1) Generate a punchy hero name
    const nameRes = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a comic-book editor. Propose a punchy one- or two-word superhero name.",
        },
        {
          role: "user",
          content: `
Gender: ${gender}
Childhood: ${childhood}
Superpower: ${superpower}
Fear: ${fear}
Inspiration (fuel): ${fuel}
Strength: ${strength}
Lesson/Tagline: ${lesson}
City: ${city}
          `.trim(),
        },
      ],
      temperature: 0.8,
      max_tokens: 10,
    });
    const raw = nameRes.choices[0].message?.content;
    const heroName = raw?.trim() ?? "The Hero";

    // 2) Build a super-charged AI prompt
    const prompt = `
Create a hyper-realistic 1990s comic-book cover starring ${heroName}.
• Use the selfie URL ONLY for the face—discard every piece of clothing it shows.
• DESIGN A BRAND-NEW COSTUME—do NOT reuse shirt, trunks, boots, belts, capes, or any Superman-like elements.
• Show the hero’s FULL BODY head-to-toe, with both hands and both feet clearly visible, in a dynamic, front-facing action pose emphasizing the power of ${superpower}.
• Costume inspiration should reflect:
    • Gender: ${gender}
    • Childhood backstory: ${childhood}
    • Fear they overcame: ${fear}
    • Source of inspiration: ${fuel}
    • Greatest strength: ${strength}
• Background: the skyline of ${city}, infused with vibrant ${superpower} effects (lightning, flames, wind) in bold 90s comic-book colors and dramatic lighting.
• Include exactly three text elements baked into the art:
    – “${heroName}” at the TOP-LEFT in bold, uppercase comic type.
    – “Issue 01” at the TOP-RIGHT in smaller comic type.
    – The tagline “${lesson}” in a banner at the BOTTOM-CENTER.
• No other text, logos, speech bubbles, or watermarks—only your hero, their story, and that cityscape.
`.trim();

    // 3) Generate the cover image
    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    // 4) Return structured response
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
