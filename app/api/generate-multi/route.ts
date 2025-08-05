// app/api/generate-multi/route.ts

import { NextResponse } from 'next/server';
import { generateComicImage } from '../../../utils/replicate';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, selfieUrl } = body;

    if (!prompt || !selfieUrl) {
      console.warn('⚠️ Missing prompt or selfieUrl', { prompt, selfieUrl });
      return NextResponse.json({ error: 'Missing prompt or selfieUrl' }, { status: 400 });
    }

    console.info('📥 /api/generate-multi body:', { prompt, selfieUrl });

    const comicImageUrl = await generateComicImage(prompt, selfieUrl);

    return NextResponse.json({ comicImageUrl });
  } catch (err) {
    console.error('❌ Error in /api/generate-multi:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
