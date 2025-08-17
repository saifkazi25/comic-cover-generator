"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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

  // Optional: add a Cloudinary text overlay if your image is on Cloudinary.
  // If not on Cloudinary, we simply return the original cover URL.
  const IG_HANDLE = "@yourbrand"; // TODO: set your real handle
  const shareCaption = `Become a Superhero at ${IG_HANDLE}`;
  const shareUrl = useMemo(() => {
    if (!comic?.comicImageUrl) return null;
    const coverUrl = comic.comicImageUrl;
    try {
      if (!coverUrl.includes("/image/upload/")) return coverUrl; // not a Cloudinary URL
      const [prefix, rest] = coverUrl.split("/image/upload/");
      const text = shareCaption.replace(/ /g, "%20").replace(/@/g, "%40");
      const overlay =
        `l_text:Montserrat_700_italic:${text},co_rgb:ffffff,bo_2px_solid_rgb:000000,e_shadow:20` +
        `/fl_layer_apply,g_south_east,x_40,y_40`;
      return `${prefix}/image/upload/${overlay}/${rest}`;
    } catch {
      return coverUrl;
    }
  }, [comic?.comicImageUrl, shareCaption]);

  const handleTryAgain = () => {
    // ✅ Keep comicInputs; clear only what needs re-capturing
    try {
      // DO NOT remove "comicInputs"
      localStorage.removeItem("selfieUrl");
      localStorage.removeItem("coverImageUrl");
      localStorage.removeItem("heroName");
    } catch {}
    window.location.href = "/comic/selfie";
  };

  const handleShare = async () => {
    if (!shareUrl) return;

    // Best-effort: try Web Share API on mobile
    try {
      // @ts-ignore
      if (navigator.share) {
        // @ts-ignore
        await navigator.share({
          title: "My Superhero Cover",
          text: shareCaption,
          url: shareUrl,
        });
        return;
      }
    } catch {
      // fall through to download
    }

    // Fallback: download the watermarked image, user uploads to IG story manually
    try {
      const res = await fetch(shareUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "superhero-story-share.jpg";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();

      // Copy caption to clipboard
      try {
        await navigator.clipboard.writeText(shareCaption);
        alert("Image downloaded. Caption copied! Open Instagram → Story → add image → paste caption.");
      } catch {
        alert("Image downloaded. Caption: " + shareCaption);
      }
    } catch {
      alert("Couldn’t prepare the share image. Please long-press/save the cover image instead.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 space-y-6">
      <h1 className="text-3xl font-extrabold">Your Superhero Comic Cover</h1>

      {loading && <p className="text-lg">🦸‍♀️ Generating your comic cover…</p>}

      {error && (
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={handleTryAgain}  // 👈 go back to selfie, keep inputs
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
          >
            Try Again
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

            {/* ACTION BAR */}
            <div className="w-full mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* LEFT: Try Again + Share */}
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  onClick={handleTryAgain}
                  className="w-full md:w-auto px-5 py-3 rounded-2xl bg-neutral-800 text-white hover:bg-neutral-700 transition shadow"
                >
                  Try Again
                </button>
                <button
                  onClick={handleShare}
                  className="w-full md:w-auto px-5 py-3 rounded-2xl bg-neutral-200 text-black hover:bg-neutral-300 transition shadow"
                >
                  Share on Instagram
                </button>
              </div>

              {/* RIGHT: Get Story + Get Merch */}
              <div className="flex flex-col md:flex-row gap-3 md:justify-end">
                <Link
                  href={storyLink}
                  className="w-full md:w-auto px-5 py-3 rounded-2xl bg-green-600 hover:bg-green-800 text-white font-extrabold text-lg sm:text-xl shadow transition text-center"
                  aria-label="View Your Origin Story"
                >
                  Get My Full Story 🚀
                </Link>
                <Link
                  href="/comic/merch" // TODO: adjust to your merch route
                  className="w-full md:w-auto px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-lg sm:text-xl shadow transition text-center"
                  aria-label="Get Merch"
                >
                  Get Merch 🛒
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
