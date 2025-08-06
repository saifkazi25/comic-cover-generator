import { NextResponse } from 'next/server';
import { generateComicImage } from '../../../utils/replicate';

export async function POST(req: Request) {
  try {
    const { prompt, selfieUrl } = await req.json();

    console.log('📥 /api/generate-multi payload:', { prompt, selfieUrl });

    if (!prompt || !selfieUrl) {
      return NextResponse.json({ error: 'Missing prompt or selfieUrl' }, { status: 400 });
    }

    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    return NextResponse.json({ comicImageUrl });
  } catch (err) {
    console.error('❌ Error in generate-multi:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
