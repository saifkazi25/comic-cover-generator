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
    // 0) Parse & validate
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

    // 1) Generate Hero Name
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

    // 2) Build the ultra-specific AI prompt
    const prompt = `
1) STRICTLY render the face from the selfie URL with hyper-realistic resemblance—no invented facial features or clothing details.

2) Create a hyper-realistic 1990s comic-book cover of ${heroName}:
• Show the hero’s FULL BODY (head-to-toe, hands & feet visible) in a bold, front-facing power pose that highlights their ${superpower}.
• Design a retro-inspired color-block leotard: daring panels of contrasting 90s hues, a sleek high-cut silhouette, matching thigh-high boots and elbow-length gloves, all accented with subtle neon trim—no capes —no logos, trunks, or belts.
• Background: the ${city} skyline alive with ${superpower} energy (lightning, flames, wind) in vivid comic-book colors and dramatic lighting.
• Integrate exactly three text elements baked into the art:
   – “${heroName}” at the TOP-LEFT in bold, uppercase comic font.
   – “Issue 01” at the TOP-RIGHT in smaller comic font.
   – The tagline “${lesson}” in a banner at the BOTTOM-CENTER.
• No other text, speech bubbles, watermarks, or generic logos.
`.trim();

    // 3) Generate the cover
    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    // 4) Return JSON
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
