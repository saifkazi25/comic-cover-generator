import { NextResponse } from 'next/server';
import { generateComicImage } from '../../../utils/replicate';

export async function POST(req: Request) {
  try {
    const { prompt, selfieUrl } = await req.json();

    console.log('📥 /api/generate-multi payload:', { prompt, selfieUrl });

    if (!prompt || !selfieUrl) {
      console.log('❌ Missing prompt or selfieUrl');
      return NextResponse.json({ error: 'Missing prompt or selfieUrl' }, { status: 400 });
    }

    let comicImageUrl;
    try {
      comicImageUrl = await generateComicImage(prompt, selfieUrl);
      console.log('✅ comicImageUrl generated:', comicImageUrl);
    } catch (genErr: any) {
      console.error('❌ Error in generateComicImage:', genErr?.message, genErr);
      return NextResponse.json({
        error: 'Image generation failed',
        details: genErr?.message || genErr,
      }, { status: 500 });
    }

    if (!comicImageUrl) {
      console.error('❌ comicImageUrl is empty');
      return NextResponse.json({ error: 'No image URL returned from model.' }, { status: 500 });
    }

    return NextResponse.json({ comicImageUrl });
  } catch (err: any) {
    console.error('❌ General API error in generate-multi:', err?.message, err);
    return NextResponse.json({
      error: 'Internal error',
      details: err?.message || err,
    }, { status: 500 });
  }
}
