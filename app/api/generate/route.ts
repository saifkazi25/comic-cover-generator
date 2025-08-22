// app/api/generate/route.ts

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generateComicImage } from "../../../utils/replicate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export interface ComicRequest {
  gender: string;
  // legacy/optional
  childhood?: string;
  superpower: string;
  city: string;
  fear: string;
  fuel?: string;
  strength?: string;
  lesson: string;
  selfieUrl: string;
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// small helper to clean model output like `" Zephyrstorm "` or `'Zephyr-Storm'`
function cleanName(s: string | undefined | null) {
  const raw = (s ?? "").trim().replace(/^["'`]+|["'`]+$/g, "");
  // collapse whitespace
  return raw.replace(/\s+/g, " ").slice(0, 60) || "The Hero";
}

export async function POST(req: Request) {
  try {
    // 0) Parse body and normalize (legacy-safe)
    const body = (await req.json()) as Partial<ComicRequest>;

    const gender = (body.gender ?? "").trim();
    const superpower = (body.superpower ?? "").trim();
    const city = (body.city ?? "").trim();
    const fear = (body.fear ?? "").trim(); // not required for cover prompt, but kept for future use
    const lesson = (body.lesson ?? "").trim();
    const selfieUrl = (body.selfieUrl ?? "").trim();

    // Optional/legacy fields with safe defaults
    const childhood = (body.childhood ?? "").trim();
    const fuel = (body.fuel ?? "hope").trim();
    const strength = (body.strength ?? "courage").trim();

    // Validate ONLY the current quiz requirements
    const requiredPairs: Array<[string, string]> = [
      ["gender", gender],
      ["superpower", superpower],
      ["city", city],
      ["lesson", lesson],
      ["selfieUrl", selfieUrl],
      // fear is collected; include it in validation if you want it strictly required:
      ["fear", fear],
    ];
    const missing = requiredPairs.filter(([, v]) => !v).map(([k]) => k);
    if (missing.length) {
      return NextResponse.json(
        { error: `Missing inputs: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // 1) Generate Hero Name (robust with fallback)
    let heroName = "The Hero";
    try {
      let nameRes = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.8,
        max_tokens: 12,
        messages: [
          {
            role: "system",
            content:
              "You are a comic-book editor. Propose a punchy one- or two-word superhero name. Respond with ONLY the name.",
          },
          {
            role: "user",
            content: `Gender: ${gender}
Superpower: ${superpower}
City: ${city}
Lesson/Tagline: ${lesson}`,
          },
        ],
      });

      heroName = cleanName(nameRes.choices?.[0]?.message?.content);

      // Fallback to older model if needed
      if (!heroName || heroName === "The Hero") {
        nameRes = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          temperature: 0.8,
          max_tokens: 12,
          messages: [
            {
              role: "system",
              content:
                "You are a comic-book editor. Propose a punchy one- or two-word superhero name. Respond with ONLY the name.",
            },
            {
              role: "user",
              content: `Gender: ${gender}
Superpower: ${superpower}
City: ${city}
Lesson/Tagline: ${lesson}`,
            },
          ],
        });
        heroName = cleanName(nameRes.choices?.[0]?.message?.content);
      }
    } catch (e) {
      console.warn("Name generation failed; using fallback.", e);
    }

    // 2) Build the ultra-specific AI prompt
    const prompt = `
Create a hyper-realistic 1990s comic-book cover of ${heroName}.
• Render the face from the selfie URL exactly giving hyper resemblance — discard all clothing details.
• Show the ${gender} hero’s FULL BODY head-to-toe (hands & feet visible) in a bold front-facing power pose that highlights their ${superpower} with absolutely no Chest logo.
• Design a retro-inspired comic-book leotard in daring color-block panels, with a sleek high-cut silhouette, matching thigh-high boots and elbow-length gloves, accented with subtle neon trim, inspired by ${superpower} - with absolutely no Chest logo and no cape.
• Bake in exactly three text elements:
   – “${heroName}” at the TOP-LEFT in bold, uppercase comic font.
   – “Issue 01” at the TOP-RIGHT in smaller comic font.
   – The tagline “${lesson}” in a banner at the BOTTOM-CENTER.
• Background: the ${city} skyline with dynamic ${superpower} effects in vivid 90s comic colors.
• No other text, logos, speech bubbles, no watermarks, comic cover image fills the whole generation with nothing behind it.
`.trim();

    // 3) Generate the cover
    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    // 4) Return JSON (+ cookie so client can fall back if they forget to save)
    const res = NextResponse.json({
      comicImageUrl,
      heroName, // original field
      superheroName: heroName, // alias many clients expect
      issue: "01",
      tagline: lesson,
    });

    // cookie lasts 7 days; client can read if localStorage isn't set yet
    res.headers.set(
      "Set-Cookie",
      `heroName=${encodeURIComponent(
        heroName
      )}; Path=/; Max-Age=604800; SameSite=Lax`
    );

    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ /api/generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
