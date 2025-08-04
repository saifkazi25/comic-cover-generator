// app/api/generate/route.ts
import { NextResponse } from 'next/server'
import { generateComicImage } from '../../../utils/replicate'

interface ComicRequest {
  gender: string
  childhood: string
  superpower: string
  city: string
  fear: string
  fuel: string
  strength: string
  lesson: string
  selfieUrl: string
}

function validatePayload(body: any): body is ComicRequest {
  const keys: (keyof ComicRequest)[] = [
    'gender',
    'childhood',
    'superpower',
    'city',
    'fear',
    'fuel',
    'strength',
    'lesson',
    'selfieUrl',
  ]
  return (
    typeof body === 'object' &&
    body !== null &&
    keys.every((k) => typeof body[k] === 'string' && body[k].trim().length > 0)
  )
}

export async function POST(req: Request) {
  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!validatePayload(payload)) {
    return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 })
  }

  const {
    gender,
    childhood,
    superpower,
    city,
    fear,
    fuel,
    strength,
    lesson,
    selfieUrl,
  } = payload

  if (process.env.NODE_ENV === 'development') {
    console.log('📥 /api/generate payload:', {
      gender,
      childhood,
      superpower,
      city,
      fear,
      fuel,
      strength,
      lesson,
      selfieUrl,
    })
  }

  const prompt = [
    'A hyper-realistic, high-resolution 1980s comic book cover illustration introducing a bold new superhero.',
    '',
    'IMPORTANT: The hero’s face and hair MUST be an unmistakable, highly accurate reproduction of the provided selfie image. Do NOT invent or alter the facial features. Absolutely NO generic comic faces—only the real facial features from the selfie. No artistic license on the face; render it as a portrait of the selfie subject. The face should look identical to the selfie, including skin tone, eye color, facial hair, hairstyle, and expression.',
    '',
    `Depict the superhero as ${gender}, shaped by a childhood defined by ${childhood}. Their extraordinary power is ${superpower}, which they use instinctively to defend others—driven by an unstoppable sense of justice.`,
    '',
    `The hero’s greatest fear is ${fear}, yet they press forward, inspired by the memory or image of ${fuel}. Friends describe their greatest strength as ${strength}. Their core message: "${lesson}".`,
    '',
    `Pose the hero in a dramatic, full-body, front-facing, mid-action stance (both arms and legs clearly visible) in the city of ${city}. Set the scene with bold ${superpower} effects and an intense atmosphere. Their costume should be iconic, tailored to their superpower and origin, with details that reference their journey.`,
    '',
    'ABSOLUTELY NO visible text, logos, speech bubbles, numbers, labels, watermarks, or signatures anywhere in the image. The cover must be 100% free of all typography and lettering.',
    '',
    'Art style: Dramatic, high-detail, stylized 1980s American comic book. Use sharp inked lines, vivid colors, dynamic shading, and a cinematic mood. Output a clean image ready for HTML/CSS overlays.',
  ].join('\n')

  try {
    const comicImageUrl = await generateComicImage(prompt, selfieUrl)
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 /api/generate result URL:', comicImageUrl)
    }
    return NextResponse.json({ comicImageUrl })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('❌ /api/generate error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method Not Allowed, use POST' },
    { status: 405 }
  )
}
