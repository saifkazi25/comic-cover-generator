import { NextResponse } from 'next/server';
import { generateComicImage } from '../../../utils/replicate';

export async function POST(req: Request) {
  try {
    const {
      gender, childhood, superpower, city, fear, fuel, strength, lesson, selfieUrl
    } = await req.json();

    // Optionally, add validation here...

    const prompt = `
A hyper-realistic, high-resolution 1980s comic book cover illustration introducing a bold new superhero.

IMPORTANT: The hero’s face and hair MUST be an unmistakable, highly accurate reproduction of the provided selfie image. Do NOT invent or alter the facial features. Absolutely NO generic comic faces—only the real facial features from the selfie. No artistic license on the face; render it as a portrait of the selfie subject. The face should look identical to the selfie, including skin tone, eye color, facial hair, hairstyle, and expression.

Depict the superhero as ${gender}, shaped by a childhood defined by ${childhood}. Their extraordinary power is ${superpower}, which they use instinctively to defend others—driven by an unstoppable sense of justice.

The hero’s greatest fear is ${fear}, yet they press forward, inspired by the memory or image of ${fuel}. Friends describe their greatest strength as ${strength}. Their core message: "${lesson}".

Pose the hero in a dramatic, full-body, front-facing, mid-action stance (both arms and legs clearly visible) in the city of ${city}. Set the scene with bold energy effects, striking lighting, and an intense atmosphere. Their costume should be iconic, tailored to their superpower and origin, with details that reference their journey.

ABSOLUTELY NO visible text, logos, speech bubbles, numbers, labels, watermarks, or signatures anywhere in the image. The cover must be 100% free of all typography and lettering.

Art style: Dramatic, high-detail, stylized 1980s American comic book. Use sharp inked lines, vivid colors, dynamic shading, and a cinematic mood. Output a clean image ready for HTML/CSS overlays. If you add any text, numbers, or logos to the image, REMOVE THEM.
    `.trim();

    const comicImageUrl = await generateComicImage(prompt, selfieUrl);
    return NextResponse.json({ comicImageUrl });

  } catch (error) {
    console.error('🛑 Error generating comic:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
