// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { generateComicImage } from "../../../utils/replicate";
import { uploadCleanVariant } from "../../../utils/cloudinary";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export interface ComicRequest {
  gender: string;
  superpower: string;
  city: string;
  fear: string;
  lesson: string;
  selfieUrl: string;
  childhood?: string;
  fuel?: string;
  strength?: string;
  profileId?: string; // <-- to tag Cloudinary uploads per user
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function cleanName(s: string | undefined | null) {
  const raw = (s ?? "").trim().replace(/^["'`]+|["'`]+$/g, "");
  return raw.replace(/\s+/g, " ").slice(0, 60) || "The Hero";
}

export async function POST(req: Request) {
  try {
    // 0️⃣ Parse & validate body
    const body = (await req.json()) as Partial<ComicRequest>;
    const {
      gender = "",
      superpower = "",
      city = "",
      fear = "",
      lesson = "",
      selfieUrl = "",
      profileId = "",
    } = Object.fromEntries(Object.entries(body).map(([k, v]) => [k, (v ?? "").toString().trim()]));

    const missing = Object.entries({ gender, superpower, city, fear, lesson, selfieUrl })
      .filter(([, v]) => !v)
      .map(([k]) => k);

    if (missing.length) {
      return NextResponse.json({ error: `Missing inputs: ${missing.join(", ")}` }, { status: 400 });
    }

    // 1️⃣ Generate Hero Name (OpenAI)
    let heroName = "The Hero";
    try {
      const chat = await openai.chat.completions.create({
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
Lesson: ${lesson}`,
          },
        ],
      });
      heroName = cleanName(chat.choices?.[0]?.message?.content);
    } catch (e) {
      console.warn("⚠️ Name generation failed:", e);
    }

    // 2️⃣ Build AI prompt for comic cover
    const prompt = `
Create a hyper-realistic 1990s comic-book cover of ${heroName}.
• Render the face from the selfie URL exactly giving hyper resemblance.
• Show the ${gender} hero’s full body in a bold, front-facing power pose that highlights their ${superpower}.
• Design a retro 90s comic outfit (leotard, thigh-high boots, gloves) inspired by ${superpower}, no logos or cape.
• Include 3 text elements only:
   – “${heroName}” top-left
   – “Issue 01” top-right
   – “${lesson}” bottom-center banner
• Background: ${city} skyline with ${superpower} effects.
• No other text, no speech bubbles, no watermarks.
`.trim();

    // 3️⃣ Generate comic image via Replicate
    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    // 4️⃣ Immediately save a CLEAN (no-caption) copy to Cloudinary main app
    try {
      const cleanUrl = await uploadCleanVariant(comicImageUrl, {
        type: "cover",
        profileId: profileId || "anon",
        extraTags: ["panels_clean", "app:main"],
      });
      console.log("[✅ Cloudinary] Clean copy saved:", cleanUrl);
    } catch (err) {
      console.warn("[⚠️ Cloudinary] Failed to save clean copy", err);
    }

    // 5️⃣ Return JSON response
    const res = NextResponse.json({
      comicImageUrl,
      heroName,
      superheroName: heroName,
      issue: "01",
      tagline: lesson,
    });

    res.headers.set(
      "Set-Cookie",
      `heroName=${encodeURIComponent(heroName)}; Path=/; Max-Age=604800; SameSite=Lax`
    );

    return res;
  } catch (err: unknown) {
    console.error("❌ /api/generate error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
