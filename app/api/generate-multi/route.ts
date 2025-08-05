// app/api/generate-multi/route.ts
import { NextResponse } from "next/server";
import { generateComicImage } from "../../../utils/replicate";

export async function POST(req: Request) {
  try {
    const { prompt, selfieUrl, gender, childhood, superpower, city, fear, fuel, strength, lesson } =
      (await req.json()) as { prompt: string; selfieUrl: string } & ComicRequest;

    const comicImageUrl = await generateComicImage(prompt, selfieUrl);
    return NextResponse.json({ comicImageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
