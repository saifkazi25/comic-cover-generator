import { NextResponse } from "next/server";
import { generateComicImage } from "../../../utils/replicate";

// ✅ Important on Vercel: make sure this runs on Node (not Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// If you ever increase work inside this route, you can bump this:
export const maxDuration = 60;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function safeString(x: any) {
  try {
    if (typeof x === "string") return x;
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

/**
 * Retry once (or more) for transient model/provider failures.
 * Also supports a fallback prompt that is simpler/safer if first attempt fails.
 */
async function generateWithRetry(prompt: string, inputImageUrl: string, seed?: number) {
  const attempts = 2;

  // Fallback prompt: shorter + safer (reduces model/provider failures)
  const fallbackPrompt =
    `${prompt}\n\n` +
    `Keep it simple. No on-screen text. Clean composition. PG-13.`;

  let lastErr: any = null;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const useFallback = attempt === 2;
    const p = useFallback ? fallbackPrompt : prompt;

    try {
      console.log("[generate-multi] generateComicImage attempt", {
        attempt,
        useFallback,
        seed,
        promptLength: p.length,
      });

      // pass {seed} like you already do
      const url = await (generateComicImage as any)(p, inputImageUrl, { seed });

      return url as string;
    } catch (e: any) {
      lastErr = e;

      // 🔥 This is what you were missing:
      // We print the full underlying error object so Vercel logs show the provider message/logs.
      console.error("[generate-multi] generateComicImage failed (raw):", e);
      console.error("[generate-multi] generateComicImage failed (message):", e?.message || e);
      console.error("[generate-multi] generateComicImage failed (details):", {
        name: e?.name,
        message: e?.message,
        status: e?.status,
        error: e?.error,
        logs: e?.logs,
        cause: e?.cause ? safeString(e.cause) : undefined,
      });

      if (attempt < attempts) {
        await sleep(1500 * attempt); // small backoff
      }
    }
  }

  throw lastErr || new Error("Generation failed (unknown).");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const prompt = body?.prompt;
    const inputImageUrl = body?.inputImageUrl;

    // optional seed
    let seed: number | undefined = undefined;
    if (body?.seed !== undefined && body?.seed !== null) {
      const parsed =
        typeof body.seed === "number" ? body.seed : Number(String(body.seed).trim());
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        seed = (parsed >>> 0) as number;
      }
    }

    console.log("API /generate-multi received:", {
      hasPrompt: !!prompt,
      hasInputImageUrl: !!inputImageUrl,
      seed,
    });

    if (!prompt || !inputImageUrl) {
      console.log("❌ 400 Error: Missing prompt or inputImageUrl", {
        promptPresent: !!prompt,
        inputImageUrlPresent: !!inputImageUrl,
      });
      return NextResponse.json(
        { ok: false, error: "Missing prompt or inputImageUrl" },
        { status: 400 }
      );
    }

    // ✅ Generate (with retry + fallback prompt)
    const comicImageUrl = await generateWithRetry(prompt, inputImageUrl, seed);

    console.log("✅ comicImageUrl generated:", comicImageUrl, "seed:", seed);

    if (!comicImageUrl) {
      console.log("❌ 500 Error: No image URL returned from model");
      return NextResponse.json(
        { ok: false, error: "No image URL returned from model." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, comicImageUrl });
  } catch (err: any) {
    console.error("❌ General API error in generate-multi:", err?.message, err);

    return NextResponse.json(
      {
        ok: false,
        error: "Internal error",
        details: err?.message || safeString(err),
      },
      { status: 500 }
    );
  }
}
