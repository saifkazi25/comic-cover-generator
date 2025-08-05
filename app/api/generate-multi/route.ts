// app/api/generate-multi/route.ts

import { NextResponse } from "next/server";
import { generateComicImage } from "../../../utils/replicate";

interface MultiRequest {
  prompt: string;
  selfieUrl: string;
}

export async function POST(req: Request) {
  try {
    // Only extract what this endpoint needs
    const { prompt, selfieUrl } = (await req.json()) as MultiRequest;

    if (!prompt || !selfieUrl) {
      return NextResponse.json({ error: "Missing prompt or selfieUrl" }, { status: 400 });
    }

    const comicImageUrl = await generateComicImage(prompt, selfieUrl);
    return NextResponse.json({ comicImageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ /api/generate-multi error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
