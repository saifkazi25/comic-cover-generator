import { NextResponse } from 'next/server';
import { generateComicImage } from '../../../utils/replicate';

export async function POST(req: Request) {
  try {
    // Parse request
    const body = await req.json();
    const prompt = body.prompt;
    const inputImageUrl = body.inputImageUrl;

    // --- Logging for debugging ---
    console.log('API /generate-multi received:', { prompt, inputImageUrl });

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
      comicImageUrl = await generateComicImage(prompt, inputImageUrl);
      console.log('✅ comicImageUrl generated:', comicImageUrl);
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
