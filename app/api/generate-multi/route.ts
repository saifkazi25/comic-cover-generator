import { NextResponse } from 'next/server';
import { generateComicImage } from '../../../utils/replicate';

export async function POST(req: Request) {
  try {
    // Parse request
    const body = await req.json();
    const { prompt, inputImageUrl, userInputs, panelIndex } = body;

    // --- Logging for debugging ---
    console.log('API /generate-multi received:', { prompt, inputImageUrl, panelIndex, userInputs });

    // Validation
    if (!prompt || !inputImageUrl || !userInputs) {
      console.log('❌ 400 Error: Missing prompt, inputImageUrl, or userInputs', { prompt, inputImageUrl, userInputs });
      return NextResponse.json(
        { error: 'Missing prompt, inputImageUrl, or userInputs' },
        { status: 400 }
      );
    }

    // --- Step 1: Get dialogue from /api/generate-dialogue ---
    let dialogueData = null;
    try {
      const dialogueRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/generate-dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          panelPrompt: prompt,
          userInputs,
          panelIndex
        }),
      });

      if (!dialogueRes.ok) {
        console.error('❌ Dialogue generation failed:', await dialogueRes.text());
      } else {
        dialogueData = await dialogueRes.json();
        console.log('✅ Dialogue generated:', dialogueData);
      }
    } catch (dlgErr: any) {
      console.error('❌ Error calling /api/generate-dialogue:', dlgErr?.message || dlgErr);
    }

    // --- Step 2: Generate image ---
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

    // --- Step 3: Success ---
    return NextResponse.json({
      comicImageUrl,
      dialogue: dialogueData?.dialogue || [],
      names: dialogueData?.names || {
        superheroName: userInputs.superheroName,
        rivalName: dialogueData?.names?.rivalName || 'Rival',
        companionName: dialogueData?.names?.companionName || 'Companion'
      }
    });
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
