import { NextResponse } from 'next/server';
import { generateComicImage } from '../../../utils/replicate';

export async function POST(req: Request) {
  try {
    // Parse request
    const body = await req.json();
    const prompt = body.prompt;
    const inputImageUrl = body.inputImageUrl;

    // 🔧 NEW: optional seed for image consistency (e.g., stable rival look)
    let seed: number | undefined = undefined;
    if (body.seed !== undefined && body.seed !== null) {
      const parsed =
        typeof body.seed === 'number'
          ? body.seed
          : Number(String(body.seed).trim());
      if (!Number.isNaN(parsed) && Number.isFinite(parsed)) {
        seed = parsed >>> 0; // force uint32
      }
    }

    // --- Logging for debugging ---
    console.log('API /generate-multi received:', {
      hasPrompt: !!prompt,
      hasInputImageUrl: !!inputImageUrl,
      seed,
    });

    // Validation
    if (!prompt || !inputImageUrl) {
      console.log('❌ 400 Error: Missing prompt or inputImageUrl', { prompt, inputImageUrl });
      return NextResponse.json(
        { error: 'Missing prompt or inputImageUrl' },
        { status: 400 }
      );
    }

    // Generate image
    let comicImageUrl;
    try {
      // 🔧 SURGICAL: pass seed as a third arg (backwards compatible if your util ignores it)
      // If your generateComicImage signature already supports options, it will use { seed }.
      // If not, this extra arg will be harmless (but you can update the util to read it).
      comicImageUrl = await (generateComicImage as any)(prompt, inputImageUrl, { seed });
      console.log('✅ comicImageUrl generated:', comicImageUrl, 'seed:', seed);
    } catch (genErr: any) {
      console.error('❌ Error in generateComicImage:', genErr?.message, genErr);
      return NextResponse.json(
        {
          error: 'Image generation failed',
          details: genErr?.message || genErr,
        },
        { status: 500 }
      );
    }

    if (!comicImageUrl) {
      console.log('❌ 500 Error: No image URL returned from model');
      return NextResponse.json(
        { error: 'No image URL returned from model.' },
        { status: 500 }
      );
    }

    // Success
    return NextResponse.json({ comicImageUrl });
  } catch (err: any) {
    console.error('❌ General API error in generate-multi:', err?.message, err);
    return NextResponse.json(
      {
        error: 'Internal error',
        details: err?.message || err,
      },
      { status: 500 }
    );
  }
}
