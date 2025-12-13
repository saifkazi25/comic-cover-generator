import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const MODEL = "black-forest-labs/flux-kontext-pro";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function pickImageUrl(output: any): string | undefined {
  if (!output) return undefined;
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    const last = output[output.length - 1];
    return typeof last === "string" ? last : undefined;
  }
  return undefined;
}

export async function generateComicImage(
  prompt: string,
  selfieUrl: string,
  options?: { seed?: number }
): Promise<string> {
  const seed = options?.seed;

  // Keep negative prompt short & safe (long negative prompts can cause weird failures)
  const negativePrompt = [
    "text",
    "watermark",
    "logo",
    "signature",
    "blurry",
    "distorted face",
    "extra fingers",
    "deformed hands",
    "nsfw",
  ].join(", ");

  console.log("[generateComicImage] Input:", {
    promptLength: prompt?.length || 0,
    selfieUrlPresent: !!selfieUrl,
    seed,
  });

  // 2 tries: original prompt, then a simplified fallback
  const prompts = [
    prompt,
    `${prompt}\n\nKeep it simple. Clean composition. No on-image text. One clear subject.`,
  ];

  let lastErr: any = null;

  for (let attempt = 1; attempt <= prompts.length; attempt++) {
    const p = prompts[attempt - 1];

    try {
      const input: Record<string, any> = {
        prompt: p,

        // ⚠️ Schema drift protection:
        // Some versions use `input_image`, some use `image`.
        input_image: selfieUrl,
        image: selfieUrl,

        negative_prompt: negativePrompt,

        // Keep minimal & common params:
        aspect_ratio: "match_input_image",
        prompt_upsampling: false,
        guidance_scale: 7.5,
        num_inference_steps: 50,
        output_format: "jpg",
        safety_tolerance: 2,

        ...(seed !== undefined ? { seed } : {}),
      };

      console.log("[generateComicImage] Attempt", attempt, {
        promptLength: p.length,
        seed,
      });

      const prediction = await replicate.predictions.create({
        model: MODEL,
        input,
      });

      let status = prediction.status;
      let output = prediction.output;
      let err = (prediction as any).error;
      let logs = (prediction as any).logs;
      const id = prediction.id;

      // ✅ Poll up to 180 seconds (Replicate often queues)
      for (let t = 0; t < 180; t++) {
        if (status === "succeeded" || status === "failed" || status === "canceled") break;

        await sleep(1000);
        const updated = await replicate.predictions.get(id);
        status = updated.status;
        output = updated.output;
        err = (updated as any).error;
        logs = (updated as any).logs;
      }

      const imageUrl = pickImageUrl(output);

      console.log("[generateComicImage] Output:", {
        id,
        status,
        hasOutput: !!output,
        hasImageUrl: !!imageUrl,
        hasError: !!err,
      });

      if (status === "succeeded" && imageUrl) {
        return imageUrl;
      }

      // Include Replicate error/logs for debugging
      const msg =
        `Generation failed: status=${status}` +
        (err ? ` | error=${String(err)}` : status === "starting" || status === "processing"
          ? " | error=timeout_waiting_for_completion"
          : "");

      const e = new Error(msg);
      (e as any).replicate = {
        id,
        status,
        error: err,
        logsPreview: typeof logs === "string" ? logs.slice(0, 1000) : logs,
      };
      throw e;
    } catch (e: any) {
      lastErr = e;

      console.error("[generateComicImage] Error:", e?.message || e);

      const r = e?.replicate;
      if (r) {
        console.error("[generateComicImage] Replicate details:", r);
      }

      // small backoff before retry
      await sleep(1200 * attempt);
    }
  }

  throw lastErr || new Error("Generation failed (unknown).");
}
