// utils/replicate.ts
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

const MODEL = 'black-forest-labs/flux-kontext-pro'

export async function generateComicImage(
  prompt: string,
  selfieUrl: string
): Promise<string> {
  const prediction = await replicate.predictions.create({
    model: MODEL,
    input: {
      prompt,
      image: selfieUrl,
      // match playground defaults:
      guidance_scale: 7.5,
      num_inference_steps: 50,
      width: 1024,
      height: 1024,
      aspect_ratio: 'match_input_image',
      output_format: 'jpg',
      safety_tolerance: 2,
    },
  })

  let status = prediction.status
  let output = prediction.output as string[] | undefined

  // poll until done
  for (let i = 0; i < 30 && (status === 'starting' || status === 'processing'); i++) {
    await new Promise((r) => setTimeout(r, 1000))
    const updated = await replicate.predictions.get(prediction.id)
    status = updated.status
    output = updated.output as string[] | undefined
    if (status === 'succeeded') break
  }

  if (status !== 'succeeded' || !output?.[0]) {
    throw new Error(`Generation failed: ${status}`)
  }

  return output[0]!
}
