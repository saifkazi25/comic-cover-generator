import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

const MODEL = 'black-forest-labs/flux-kontext-pro';

export async function generateComicImage(
  prompt: string,
  selfieUrl: string
): Promise<string> {
  // Negative prompt to block undesired artifacts or styles
  const negativePrompt = [
    'selfie clothing',
    'shirt pattern',
    'fabric folds',
    'recoloring existing shirt',
    'jeans',
    'casual wear',
    'Superman logo',
    'DC logo',
    'No logo',
    'S-shield',
    'Superman',
    'cape like Superman',
    'blue trunks',
    'red boots',
    'yellow belt with buckle',
    'muscle suit pattern',
  ].join(', ');

  // ---- LOG your input! ----
  console.log('[generateComicImage] Input:', { prompt, selfieUrl });

  try {
    const prediction = await replicate.predictions.create({
      model: MODEL,
      input: {
        prompt,
        input_image: selfieUrl,
        negative_prompt: negativePrompt,
        aspect_ratio: 'match_input_image',
        prompt_upsampling: false,
        guidance_scale: 7.5,
        num_inference_steps: 50,
        width: 1024,
        height: 1024,
        output_format: 'jpg',
        safety_tolerance: 2,
      },
    });

    let { status, output, id } = prediction as {
      status: string;
      output?: string | string[];
      id: string;
    };

    // Poll for completion (max 30 seconds)
    for (let i = 0; i < 30 && (status === 'starting' || status === 'processing'); i++) {
      await new Promise((r) => setTimeout(r, 1000));
      const updated = await replicate.predictions.get(id);
      status = updated.status;
      output = updated.output;
      if (status === 'succeeded') break;
    }

    // ---- LOG output and status! ----
    console.log('[generateComicImage] Output:', { status, output });

    // Handle both string and array output types
    let imageUrl: string | undefined;
    if (Array.isArray(output)) {
      imageUrl = output[output.length - 1];
    } else if (typeof output === 'string') {
      imageUrl = output;
    }

    if (status !== 'succeeded' || !imageUrl) {
      throw new Error(`Generation failed: status=${status}`);
    }

    return imageUrl;
  } catch (err: any) {
    // ---- LOG error! ----
    console.error('[generateComicImage] Error:', err?.message || err, err);
    throw err;
  }
}
