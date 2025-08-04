// utils/replicate.ts

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const MODEL = 'black-forest-labs/flux-kontext-pro';

export async function generateComicImage(
  prompt: string,
  selfieUrl: string
): Promise<string> {
  // 1) Define everything you absolutely don’t want the model to draw:
  const negativePrompt = [
  // Block any reuse of your selfie’s clothes:
    'selfie clothing', 
    'shirt pattern', 
    'fabric folds', 
    'recoloring existing shirt', 
    'jeans', 
    'casual wear',
    // Block Superman branding:
   'Superman logo', 'S-shield', 'cape like Superman', 'blue trunks', 'red boots',
    'yellow belt with buckle', 'muscle suit pattern',
  ].join(', ');

  // 2) Fire off the prediction with Playground-matching parameters + negative prompt:
  const prediction = await replicate.predictions.create({
    model: MODEL,
    input: {
      prompt,
      input_image: selfieUrl,
      negative_prompt: negativePrompt,    // ← here’s the key addition
      aspect_ratio: "match_input_image",
      prompt_upsampling: false,
      guidance_scale: 7.5,
      num_inference_steps: 50,
      width: 1024,
      height: 1024,
      output_format: "jpg",
      safety_tolerance: 2
    },
  });

  // 3) Poll until it finishes
  let { status, output, id } = prediction as {
    status: string;
    output?: string;
    id: string;
  };

  for (let i = 0; i < 30 && (status === 'starting' || status === 'processing'); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const updated = await replicate.predictions.get(id);
    status = updated.status;
    output = updated.output as string | undefined;
    if (status === 'succeeded') break;
  }

  if (status !== 'succeeded' || !output) {
    throw new Error(`Generation failed: ${status}`);
  }

  return output;
}
