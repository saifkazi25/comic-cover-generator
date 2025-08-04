import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const MODEL = 'black-forest-labs/flux-kontext-pro';

export async function generateComicImage(
  prompt: string,
  selfieUrl: string
): Promise<string> {
  const prediction = await replicate.predictions.create({
    model: MODEL,
    input: {
      prompt,
      input_image: selfieUrl,
      aspect_ratio: 'match_input_image',
      output_format: 'jpg',
      guidance_scale: 7.5,
      num_inference_steps: 50,
      safety_tolerance: 2,
      prompt_upsampling: true,
    },
  });

  let status = prediction.status;
  let output = prediction.output as string | undefined;

  // poll until finished
  for (let i = 0; i < 60 && (status === 'starting' || status === 'processing'); i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const updated = await replicate.predictions.get(prediction.id);
    status = updated.status;
    output = updated.output as string | undefined;
    if (status === 'succeeded') break;
  }

  if (status !== 'succeeded' || !output) {
    throw new Error(`Generation failed: ${status}`);
  }
  return output;
}
