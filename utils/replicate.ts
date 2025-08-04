// utils/replicate.ts
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const DEFAULT_MODEL = "black-forest-labs/flux-kontext-pro";

export async function generateComicImage(
  prompt: string,
  selfieUrl: string
): Promise<string> {
  const prediction = await replicate.predictions.create({
    model: DEFAULT_MODEL,
    input: {
      prompt,
      image: selfieUrl,
      // ---- ADD THESE ----
      guidance_scale: 7.5,
      num_inference_steps: 50,
      // (optionally) seed: 12345,
    },
  });

  // polling loop unchanged…
  let status = prediction.status;
  let output = prediction.output;
  const pollingInterval = 1000;
  const maxRetries = 30;

  for (let i = 0; i < maxRetries && (status === "starting" || status === "processing"); i++) {
    await new Promise((r) => setTimeout(r, pollingInterval));
    const refreshed = await replicate.predictions.get(prediction.id);
    status = refreshed.status;
    output = refreshed.output;
    if (status === "succeeded") break;
  }

  if (status !== "succeeded" || !output || typeof output !== "string") {
    throw new Error("Replicate generation failed or incomplete.");
  }

  return output;
}
