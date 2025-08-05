// app/api/generate-multi/route.ts
import { NextResponse } from "next/server";
import { generateComicImage } from "../../../utils/replicate";

export async function POST(req: Request) {
  const body = await req.json();
  console.log("📥 /api/generate-multi body:", body);

  const { prompt, selfieUrl } = body as { prompt?: string; selfieUrl?: string };

  if (!prompt || !selfieUrl) {
    console.warn("⚠️ Missing prompt or selfieUrl");
    return NextResponse.json(
      { error: "Missing prompt or selfieUrl" },
      { status: 400 }
    );
  }

  try {
    const comicImageUrl = await generateComicImage(prompt, selfieUrl);
    return NextResponse.json({ comicImageUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ /api/generate-multi error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
