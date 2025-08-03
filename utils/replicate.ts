import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const DEFAULT_MODEL = 'black-forest-labs/flux-kontext-pro';

export async function generateComicImage(prompt: string, selfieUrl: string): Promise<string> {
  const prediction = await replicate.predictions.create({
    model: DEFAULT_MODEL,
    input: {
      prompt,
      image: selfieUrl, // Pass Cloudinary URL directly!
    },
  });

  // Poll for completion:
  const predictionId = prediction.id;
  let status = prediction.status;
  let output = prediction.output;
  const pollingInterval = 1000;
  const maxRetries = 30;

  for (let i = 0; i < maxRetries && (status === 'starting' || status === 'processing'); i++) {
    await new Promise(res => setTimeout(res, pollingInterval));
    const refreshed = await replicate.predictions.get(predictionId);
    status = refreshed.status;
    output = refreshed.output;
    if (status === 'succeeded') break;
  }

  if (status !== 'succeeded' || !output || typeof output !== 'string') {
    throw new Error('Replicate generation failed or incomplete.');
  }

  return output; // This is the comic image URL
}
