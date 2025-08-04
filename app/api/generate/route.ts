// app/api/generate/route.ts
import { NextResponse } from 'next/server';
import { generateComicImage } from '../../../utils/replicate';

interface ComicInputs {
  gender: string;
  childhood: string;
  superpower: string;
  city: string;
  fear: string;
  fuel: string;
  strength: string;
  lesson: string;
  selfieUrl: string;
}

export async function POST(req: Request) {
  try {
    const inputs = (await req.json()) as ComicInputs;

    const prompt = `
A hyper-realistic, high-resolution 1980s comic book cover illustration introducing a bold new superhero.

IMPORTANT: The hero’s face and hair MUST be an unmistakable, highly accurate reproduction of the provided selfie image. Do NOT invent or alter the facial features. Absolutely NO generic comic faces—only the real facial features from the selfie. No artistic license on the face; render it as a portrait of the selfie subject. The face should look identical to the selfie, including skin tone, eye color, facial hair, hairstyle, and expression.

Depict the superhero as ${inputs.gender}, shaped by a childhood defined by ${inputs.childhood}. Their extraordinary power is ${inputs.superpower}, which they use instinctively to defend others—driven by an unstoppable sense of justice.

The hero’s greatest fear is ${inputs.fear}, yet they press forward, inspired by the memory or image of ${inputs.fuel}. Friends describe their greatest strength as ${inputs.strength}. Their core message: "${inputs.lesson}".

Pose the hero in a dramatic, full-body, front-facing, mid-action stance in the city of ${inputs.city}. Set the scene with bold energy effects, striking lighting, and an intense atmosphere. Their costume should be iconic, tailored to their superpower and origin, with details that reference their journey.

ABSOLUTELY NO visible text, logos, speech bubbles, numbers, labels, watermarks, or signatures anywhere in the image.

Art style: Dramatic, high-detail, stylized 1980s American comic book. Sharp inked lines, vivid colors, dynamic shading.
    `.trim();

    const comicImageUrl = await generateComicImage(prompt, inputs.selfieUrl);
    return NextResponse.json({ comicImageUrl });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
