// utils/replicate.ts

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const DEFAULT_MODEL = 'black-forest-labs/flux-kontext-pro';

export async function generateComicImage(
  prompt: string,
  selfieUrl: string
): Promise<string> {
  console.log('🧠 Generating comic...');
  console.log('📝 Prompt:', prompt);
  console.log('📸 Selfie URL:', selfieUrl);

  const prediction = await replicate.predictions.create({
    model: DEFAULT_MODEL,
    input: {
      prompt,
      image: selfieUrl, // <-- THIS is what tells the model to use your real face!
    },
  });

  if (!prediction || !prediction.id) {
    throw new Error('❌ Failed to start prediction.');
  }

  const predictionId = prediction.id;
  const pollingInterval = 1000; // 1 second
  const maxRetries = 30;

  let status = prediction.status;
  let output = prediction.output;

  // Poll for status
  for (let i = 0; i < maxRetries && (status === 'starting' || status === 'processing'); i++) {
    console.log(`⏳ Polling attempt ${i + 1}, status: ${status}`);
    await new Promise((res) => setTimeout(res, pollingInterval));
    const refreshed = await replicate.predictions.get(predictionId);
    status = refreshed.status;
    output = refreshed.output;

    if (status === 'succeeded') break;
  }

  // Handle output as string or array
  let finalUrl = "";
  if (Array.isArray(output)) {
    finalUrl = output[0] ?? "";
  } else if (typeof output === "string") {
    finalUrl = output;
  }

  if (!finalUrl) {
    console.error('❌ Final prediction status:', status);
    console.error('❌ Full Replicate output:', output);
    throw new Error('❌ Replicate generation failed or incomplete.');
  }

  console.log('✅ Final prediction succeeded:', predictionId);
  console.log('✅ Output:', finalUrl);

  return finalUrl;
}
