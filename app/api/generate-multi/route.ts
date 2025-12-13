import { NextResponse } from "next/server";
import { generateComicImage } from "../../../utils/replicate";

// ✅ Ensure Node runtime on Vercel (not Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
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

function normalizeSeed(maybeSeed: any): number | undefined {
  if (maybeSeed === undefined || maybeSeed === null) return undefined;
  const parsed =
    typeof maybeSeed === "number" ? maybeSeed : Number(String(maybeSeed).trim());
  if (!Number.isFinite(parsed)) return undefined;
  return (parsed >>> 0) as number; // uint32
}

/**
 * Retry for transient provider/model failures.
 * Attempt 2 uses a simplified prompt that tends to succeed more often.
 */
async function generateWithRetry(prompt: string, inputImageUrl: string, seed?: number) {
  const attempts = 2;

  const fallbackPrompt =
    `${prompt}\n\n` +
    `Keep it simple. Clean composition. No on-image text, no captions, no speech bubbles. PG-13.`;

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
        hasInputImageUrl: !!inputImageUrl,
      });

      // Your util supports (prompt, imageUrl, { seed })
      const url = await generateComicImage(p, inputImageUrl, { seed });
      return url;
    } catch (e: any) {
      lastErr = e;

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
        await sleep(1500 * attempt);
      }
    }
  }

  throw lastErr || new Error("Generation failed (unknown).");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const prompt = body?.prompt ? String(body.prompt) : "";
    const inputImageUrl = body?.inputImageUrl ? String(body.inputImageUrl) : "";
    const seed = normalizeSeed(body?.seed);

    console.log("API /generate-multi received:", {
      hasPrompt: !!prompt,
      hasInputImageUrl: !!inputImageUrl,
      seed,
    });

    if (!prompt || !inputImageUrl) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing prompt or inputImageUrl",
          details: {
            promptPresent: !!prompt,
            inputImageUrlPresent: !!inputImageUrl,
          },
        },
        { status: 400 }
      );
    }

    const comicImageUrl = await generateWithRetry(prompt, inputImageUrl, seed);

    if (!comicImageUrl) {
      return NextResponse.json(
        { ok: false, error: "No image URL returned from model." },
        { status: 500 }
      );
    }

    console.log("✅ comicImageUrl generated:", comicImageUrl, "seed:", seed);
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
