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

  /** ======== Product previews using your blank mockups (T-shirt, Crop Top, Tote, Mug) ======== */
  const MOCKUPS: Record<"shirt" | "crop" | "tote" | "mug", string> = {
    shirt: "/mockups/tee-blank.png",
    crop: "/mockups/crop-blank.png",
    tote: "/mockups/tote-blank.png",
    mug: "/mockups/mug-blank.png",
  };

  const renderPreview = (type: "shirt" | "crop" | "tote" | "mug") => {
    const cover = comic?.comicImageUrl || "";
    const bg = MOCKUPS[type];

    // aspect ratios chosen to match your images
    const aspect =
      type === "shirt" ? "aspect-[4/5]" :
      type === "crop"  ? "aspect-[5/3]" :
      type === "tote"  ? "aspect-[3/4]" :
                         "aspect-[5/3]"; // mug

    // print-area sizing per product
    const widthClass =
      type === "shirt" ? "w-[50%]" :
      type === "crop"  ? "w-[52%]" :
      type === "tote"  ? "w-[55%]" :
                         "w-[65%]"; // mug

    return (
      <div className="rounded-2xl bg-neutral-900/80 border border-white/10 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className={`relative w-full ${aspect} rounded-xl overflow-hidden`}>
          {/* Blank product image */}
          <img
            src={bg}
            alt={`${type} blank`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />
          {/* User cover as print */}
          <img
            src={cover}
            alt={`${type} print`}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${widthClass} max-h-[72%] object-contain rounded-md shadow-[0_10px_25px_rgba(0,0,0,0.45)]`}
            style={{
              // small product-specific vertical tweaks
              transform:
                type === "shirt"
                  ? "translate(-50%, -35%)"
                  : type === "crop"
                  ? "translate(-50%, -40%)"
                  : type === "tote"
                  ? "translate(-50%, -30%)"
                  : "translate(-50%, -40%)", // mug
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 space-y-6">
      <h1 className="text-3xl font-extrabold">Your Superhero Comic Cover</h1>

      {loading && <p className="text-lg">🦸‍♀️ Generating your comic cover…</p>}

      {error && (
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={handleTryAgain}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && comic && (
        <>
          <div className="flex flex-col items-center max-w-2xl w-full space-y-4">
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

            {/* ================= TILE LAYOUT ================= */}
            <div className="w-full mt-4 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4">
              {/* LEFT TILE: Try Again */}
              <button
                onClick={handleTryAgain}
                className="h-full md:h-auto md:self-start px-6 py-6 rounded-2xl bg-neutral-800 text-white hover:bg-neutral-700 transition shadow text-lg font-semibold"
              >
                Try Again
              </button>

              {/* RIGHT STACK: Share IG, Get Story, Get Merch + Previews */}
              <div className="grid grid-cols-1 gap-4">
                {/* Share IG (Instagram gradient + icon) */}
                <button
                  onClick={handleShare}
                  className="w-full px-6 py-6 rounded-2xl text-white shadow transition text-lg font-semibold
                             bg-gradient-to-r from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5]
                             hover:brightness-110"
                >
                  <span className="inline-flex items-center gap-3">
                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 448 512" className="drop-shadow">
                      <path fill="currentColor" d="M224,202.66A53.34,53.34,0,1,0,277.34,256,53.38,53.38,0,0,0,224,202.66Zm124.71-41a54,54,0,0,0-30.21-30.21C297.61,120,224,120,224,120s-73.61,0-94.5,11.47a54,54,0,0,0-30.21,30.21C88,143.39,88,216.94,88,216.94s0,73.55,11.47,94.44A54,54,0,0,0,129.68,341.6C150.57,353.06,224,353.06,224,353.06s73.61,0,94.5-11.46a54,54,0,0,0,30.21-30.21C360,290.49,360,216.94,360,216.94S360,143.39,348.71,161.66ZM224,318.66A62.66,62.66,0,1,1,286.66,256,62.73,62.73,0,0,1,224,318.66Zm80-113.06a14.66,14.66,0,1,1,14.66-14.66A14.66,14.66,0,0,1,304,205.6Z"/>
                    </svg>
                    Share on Instagram
                  </span>
                </button>

                {/* Get Story */}
                <Link
                  href={storyLink}
                  className="w-full px-6 py-6 rounded-2xl bg-green-600 hover:bg-green-700 text-white shadow transition text-lg font-extrabold text-center"
                  aria-label="View Your Origin Story"
                >
                  Get My Full Story 🚀
                </Link>

                {/* Get Merch */}
                <Link
                  href="/comic/merch" // TODO: adjust to your merch route
                  className="w-full px-6 py-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow transition text-lg font-extrabold text-center"
                  aria-label="Get Merch"
                >
                  Get Merch 🛒
                </Link>

                {/* Merch previews under Get Merch */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    {renderPreview("shirt")}
                    <div className="mt-2 text-sm text-neutral-300">T-Shirt</div>
                  </div>
                  <div className="text-center">
                    {renderPreview("crop")}
                    <div className="mt-2 text-sm text-neutral-300">Women Crop Top</div>
                  </div>
                  <div className="text-center">
                    {renderPreview("tote")}
                    <div className="mt-2 text-sm text-neutral-300">Tote Bag</div>
                  </div>
                  <div className="text-center">
                    {renderPreview("mug")}
                    <div className="mt-2 text-sm text-neutral-300">Mug</div>
                  </div>
                </div>
              </div>
            </div>
            {/* =============== /TILE LAYOUT =============== */}
          </div>
        </>
      )}
    </div>
  );
}
