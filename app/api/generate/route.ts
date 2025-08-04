// app/api/generate/route.ts

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generateComicImage } from "../../../utils/replicate";

export interface ComicRequest {
  gender: string;      // Q1
  childhood: string;   // Q2
  superpower: string;  // Q3
  city: string;        // Q4
  fear: string;        // Q5
  fuel: string;        // Q6
  strength: string;    // Q7
  lesson: string;      // Q8 (tagline)
  selfieUrl: string;   // uploaded selfie
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  try {
    // 1) Parse & validate request body
    const body = (await req.json()) as ComicRequest;
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
    } = body;

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
      return NextResponse.json(
        { error: "Missing one or more inputs" },
        { status: 400 }
      );
    }

    // 2) Generate a Hero Name via OpenAI
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
    const heroName = nameRes.choices[0].message?.content.trim() ?? "The Hero";

    // 3) Build the SDXL prompt
    const prompt = `
Create a hyper-realistic 1980s comic-book cover starring ${heroName}.
• Use the provided selfie URL to render the hero’s face exactly—no invented features.
• Show the heros full body from head to toe, with both hands and both feet clearly visible, in a dynamic front-facing action pose showcasing the power of ${superpower}.
• Background: a vibrant, ${superpower}-infused skyline of ${city}, styled in bold 80s comic-book colors and lighting.
• Integrate exactly three text elements into the art:
  – The title “${heroName}” at the TOP-LEFT corner (bold, uppercase comic font).
  – “Issue 01” at the TOP-RIGHT corner (smaller comic font).
  – The tagline “${lesson}” in a banner at the BOTTOM-CENTER.
• No other text, logos, speech bubbles, captions, or watermarks—only those three elements.
    `.trim();

    // 4) Generate via your helper
    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    // 5) Return the response
    return NextResponse.json({
      comicImageUrl,
      heroName,
      issue: "01",
      tagline: lesson,
    });
  } catch (err: unknown) {
    // safely extract a message
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ /api/generate error:", message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
