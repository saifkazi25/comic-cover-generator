"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface ComicResponse {
  comicImageUrl: string;
  heroName?: string;          // may come as heroName
  superheroName?: string;     // or as superheroName (alias)
  issue: string;
  tagline: string;
}

export default function ComicResultPage() {
  const [comic, setComic] = useState<ComicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🔧 helper: read hero name from cookie if needed
  const readHeroFromCookie = () => {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(/(?:^|;\s*)heroName=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  };

  // Fire the generate call once
  const generate = useCallback(async () => {
    const storedInputs = localStorage.getItem("comicInputs");
    const selfieUrl = localStorage.getItem("selfieUrl");

    if (!storedInputs || !selfieUrl) {
      setError("Missing your quiz inputs or selfie – please start again.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const inputData = JSON.parse(storedInputs);
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...inputData, selfieUrl }),
        credentials: "include", // 🔧 accept Set-Cookie: heroName=...
      });

      const data = (await res.json()) as ComicResponse;
      if (!res.ok) {
        throw new Error((data as any)?.error || "Generation failed");
      }

      // 🔧 normalize and persist heroName
      const name =
        (data.heroName ?? data.superheroName ?? "").trim() ||
        readHeroFromCookie();

      if (name) {
        localStorage.setItem("heroName", name);
      }

      setComic({
        ...data,
        heroName: name || data.heroName || data.superheroName || "Hero",
      });

      // --- existing: save cover URL for story page ---
      localStorage.setItem("coverImageUrl", data.comicImageUrl);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    generate();
  }, [generate]);

  // Build the story-link query param
  const storyLink = comic
    ? `/comic/story?data=${encodeURIComponent(
        localStorage.getItem("comicInputs") || ""
      )}`
    : "#";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 space-y-6">
      <h1 className="text-3xl font-extrabold">Your Superhero Comic Cover</h1>

      {loading && <p className="text-lg">🦸‍♀️ Generating your cover…</p>}

      {error && (
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={generate}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && comic && (
        <>
          <div className="flex flex-col items-center max-w-xl w-full space-y-4">
            <img
              src={comic.comicImageUrl}
              alt={`Cover of ${comic.heroName || "Hero"}`}
              className="rounded-xl border-4 border-yellow-500 shadow-xl w-full object-cover"
            />

            <div className="text-center space-y-1">
              <p className="text-2xl font-bold">{comic.heroName || "Hero"}</p>
              <p className="uppercase tracking-widest">Issue {comic.issue}</p>
              <p className="italic">“{comic.tagline}”</p>
            </div>

            {/* 🔥 Big primary CTA */}
            <Link
              href={comic ? storyLink : "#"}
              className="w-full mt-4 bg-green-600 hover:bg-green-800 text-white font-extrabold text-xl sm:text-2xl py-4 px-8 rounded-2xl shadow-lg transition-transform duration-200 ease-out active:scale-95 hover:scale-[1.02] focus:outline-none focus:ring-4 focus:ring-green-400/40 text-center"
              aria-label="View Your Origin Story"
            >
              View My Full Story 🚀
            </Link>

            {/* Secondary actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <Link
                href="/comic/selfie"
                className="flex-1 px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-800 text-center font-semibold"
              >
                Start Over
              </Link>

              <a
                href={comic.comicImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-center font-semibold"
              >
                Download Full-Res
              </a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
