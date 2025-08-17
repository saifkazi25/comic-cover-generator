"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";

interface ComicResponse {
  comicImageUrl: string;
  heroName?: string;
  superheroName?: string;
  issue: string;
  tagline: string;
}

/* ---------- Detect if the cover has a matte/border around it ---------- */
type CoverStyle = "bordered" | "clean";

/** Robust detector with a SAFE 'bordered' fallback when CORS/taint happens. */
async function detectCoverStyle(url: string): Promise<CoverStyle> {
  const SAFE_FALLBACK: CoverStyle = "bordered";

  const loadAsImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  try {
    let img: HTMLImageElement;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      img = await loadAsImage(obj);
      URL.revokeObjectURL(obj);
    } catch {
      // If fetch fails (CORS), still try to load directly.
      img = await loadAsImage(url);
    }

    const w = Math.min(img.naturalWidth || img.width, 1000);
    const h = Math.min(img.naturalHeight || img.height, 1000);
    if (!w || !h) return SAFE_FALLBACK;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return SAFE_FALLBACK;

    ctx.drawImage(img, 0, 0, w, h);

    // 8% edge bands (wider = more tolerant to catch frames)
    const band = Math.max(2, Math.floor(Math.min(w, h) * 0.08));

    const topR = ctx.getImageData(0, 0, w, band).data;
    const botR = ctx.getImageData(0, h - band, w, band).data;
    const lefR = ctx.getImageData(0, 0, band, h).data;
    const rigR = ctx.getImageData(w - band, 0, band, h).data;

    // Center box to compare with edges
    const cx = Math.floor(w * 0.2);
    const cy = Math.floor(h * 0.2);
    const cw = Math.floor(w * 0.6);
    const ch = Math.floor(h * 0.6);
    const cenR = ctx.getImageData(cx, cy, cw, ch).data;

    const stats = (data: Uint8ClampedArray) => {
      let n = 0,
        r = 0,
        g = 0,
        b = 0,
        a = 0,
        ySum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const R = data[i],
          G = data[i + 1],
          B = data[i + 2],
          A = data[i + 3];
        const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        r += R;
        g += G;
        b += B;
        a += A;
        ySum += Y;
        n++;
      }
      const meanY = ySum / Math.max(1, n);
      // MAD on luma
      let mad = 0;
      for (let i = 0; i < data.length; i += 4) {
        const Y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        mad += Math.abs(Y - meanY);
      }
      mad = mad / Math.max(1, n);
      return {
        meanR: r / Math.max(1, n),
        meanG: g / Math.max(1, n),
        meanB: b / Math.max(1, n),
        meanA: a / Math.max(1, n),
        madY: mad,
      };
    };

    const sTop = stats(topR);
    const sBot = stats(botR);
    const sLef = stats(lefR);
    const sRig = stats(rigR);
    const sCen = stats(cenR);

    // If edges are even a little transparent → treat as clean (no hard crop)
    const edgeAlpha =
      (sTop.meanA + sBot.meanA + sLef.meanA + sRig.meanA) / 4 / 255;
    if (edgeAlpha < 0.90) return "clean";

    // Average edge "flatness" (low MAD means uniform border)
    const edgeMad = (sTop.madY + sBot.madY + sLef.madY + sRig.madY) / 4;

    // Color distance between edges (low means a solid consistent frame)
    const dist = (a: any, b: any) =>
      Math.hypot(a.meanR - b.meanR, a.meanG - b.meanG, a.meanB - b.meanB);
    const edgeColorSpread =
      (dist(sTop, sBot) + dist(sTop, sLef) + dist(sTop, sRig) + dist(sLef, sRig)) /
      4;

    // Decide "bordered" with tolerant thresholds (more aggressive than before)
    const BORDERED =
      (edgeMad < 22 && sCen.madY > 10) ||
      (edgeMad < 28 && edgeColorSpread < 35 && sCen.madY > 9);

    return BORDERED ? "bordered" : "clean";
  } catch {
    return SAFE_FALLBACK;
  }
}

export default function ComicResultPage() {
  const [comic, setComic] = useState<ComicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("clean");

  // 💸 Prices
  const PRICES = { story: 19, shirt: 159, crop: 149, tote: 99, mug: 99 };

  const readHeroFromCookie = () => {
    if (typeof document === "undefined") return "";
    const m = document.cookie.match(/(?:^|;\s*)heroName=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  };

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
        credentials: "include",
      });

      const data = (await res.json()) as ComicResponse;
      if (!res.ok) throw new Error((data as any)?.error || "Generation failed");

      const name =
        (data.heroName ?? data.superheroName ?? "").trim() ||
        readHeroFromCookie();
      if (name) localStorage.setItem("heroName", name);

      setComic({
        ...data,
        heroName: name || data.heroName || data.superheroName || "Hero",
      });

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

  useEffect(() => {
    (async () => {
      if (!comic?.comicImageUrl) return;
      const style = await detectCoverStyle(comic.comicImageUrl);
      setCoverStyle(style);
    })();
  }, [comic?.comicImageUrl]);

  const storyLink = comic
    ? `/comic/story?data=${encodeURIComponent(
        localStorage.getItem("comicInputs") || ""
      )}`
    : "#";

  const IG_HANDLE = "@yourbrand";
  const shareCaption = `Become a Superhero at ${IG_HANDLE}`;
  const shareUrl = useMemo(() => {
    if (!comic?.comicImageUrl) return null;
    const coverUrl = comic.comicImageUrl;
    try {
      if (!coverUrl.includes("/image/upload/")) return coverUrl;
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
    try {
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
    } catch {}
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
        alert("Image downloaded. Caption copied!");
      } catch {
        alert("Image downloaded. Caption: " + shareCaption);
      }
    } catch {
      alert("Couldn’t prepare the share image. Please save the cover image instead.");
    }
  };

  /** ======== Mockups ======== */
  const MOCKUPS: Record<"shirt" | "crop" | "tote" | "mug", string> = {
    shirt: "/mockups/tee-blank.png",
    crop: "/mockups/crop-blank.png",
    tote: "/mockups/tote-blank.png",
    mug: "/mockups/mug-blank.png",
  };

  /** ======== Print areas (percent of preview frame) ======== */
  // Slightly **shorter** tee & tote so they don't look tall; centered on panel.
  const PRINT_BOX: Record<
    "shirt" | "crop" | "tote" | "mug",
    { top: number; left: number; width: number; height: number; aspect: string }
  > = {
    // less vertical presence on tee
    shirt: { top: 24, left: 31, width: 37, height: 39, aspect: "aspect-[4/5]" },
    crop:  { top: 34, left: 34, width: 31, height: 42, aspect: "aspect-[5/3]" },
    // tote wider & **shorter**
    tote:  { top: 49, left: 32, width: 36, height: 30, aspect: "aspect-[3/4]" },
    mug:   { top: 33, left: 30, width: 27, height: 34, aspect: "aspect-[5/3]" },
  };

  /** ======== Side-crop (clip-path) in % of image width ======== */
  // Always crop some sides to catch walls; do more when a border is detected.
  const SIDE_CLIP_BORDERED: Record<"shirt" | "crop" | "tote" | "mug", [number, number]> = {
    shirt: [10, 10],
    crop:  [9, 9],
    tote:  [11, 11],
    mug:   [10, 10],
  };
  const SIDE_CLIP_CLEAN: Record<"shirt" | "crop" | "tote" | "mug", [number, number]> = {
    shirt: [5, 5],
    crop:  [5, 5],
    tote:  [5, 5],
    mug:   [4, 4],
  };

  // Nudge mug art away from the handle
  const X_SHIFT: Record<"shirt" | "crop" | "tote" | "mug", number> = {
    shirt: 0,
    crop: 0,
    tote: 0,
    mug: -6,
  };

  const renderPreview = (type: "shirt" | "crop" | "tote" | "mug") => {
    const cover = comic?.comicImageUrl || "";
    const bg = MOCKUPS[type];
    const box = PRINT_BOX[type];
    const [clipLeft, clipRight] =
      (coverStyle === "bordered" ? SIDE_CLIP_BORDERED : SIDE_CLIP_CLEAN)[type];
    const xShift = X_SHIFT[type];

    return (
      <div className="rounded-2xl bg-neutral-900/80 border border-white/10 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className={`relative w-full ${box.aspect} rounded-xl overflow-hidden`}>
          {/* Blank product */}
          <img
            src={bg}
            alt={`${type} blank`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />

          {/* Print area: keep full image height; side-crop via clip-path (no distortion) */}
          <div
            className="absolute overflow-hidden flex items-center justify-center"
            style={{
              top: `${box.top}%`,
              left: `${box.left}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
            }}
          >
            <img
              src={cover}
              alt={`${type} print`}
              className="select-none"
              style={{
                height: "100%",
                width: "auto",
                display: "block",
                clipPath: `inset(0% ${clipRight}% 0% ${clipLeft}%)`,
                transform: `translateX(${xShift}%)`,
                transformOrigin: "center",
              }}
              draggable={false}
            />
          </div>
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
              alt="Your comic cover"
              className="rounded-xl border-4 border-yellow-500 shadow-xl w-full object-cover"
            />

            {/* ================= TILE LAYOUT ================= */}
            <div className="w-full mt-4 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4">
              {/* LEFT: Try Again */}
              <button
                onClick={handleTryAgain}
                className="h-full md:h-auto md:self-start px-6 py-6 rounded-2xl bg-neutral-800 text-white hover:bg-neutral-700 transition shadow text-lg font-semibold"
              >
                Try Again
              </button>

              {/* RIGHT: Actions + Previews */}
              <div className="grid grid-cols-1 gap-4">
                {/* Share IG */}
                <button
                  onClick={handleShare}
                  className="w-full px-6 py-6 rounded-2xl text-white shadow transition text-lg font-semibold
                             bg-gradient-to-r from-[#feda75] via-[#fa7e1e] via-[#d62976] via-[#962fbf] to-[#4f5bd5]
                             hover:brightness-110"
                >
                  <span className="inline-flex items-center gap-3">
                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 448 512" className="drop-shadow">
                      <path
                        fill="currentColor"
                        d="M224,202.66A53.34,53.34,0,1,0,277.34,256,53.38,53.38,0,0,0,224,202.66Zm124.71-41a54,54,0,0,0-30.21-30.21C297.61,120,224,120,224,120s-73.61,0-94.5,11.47a54,54,0,0,0-30.21,30.21C360,290.49,360,216.94,360,216.94S360,143.39,348.71,161.66ZM224,318.66A62.66,62.66,0,1,1,286.66,256,62.73,62.73,0,0,1,224,318.66Zm80-113.06a14.66,14.66,0,1,1,14.66-14.66A14.66,14.66,0,0,1,304,205.6Z"
                      />
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
                  Get My Full Story — AED {PRICES.story} 🚀
                </Link>

                {/* Get Merch */}
                <Link
                  href="/comic/merch"
                  className="w-full px-6 py-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow transition text-lg font-extrabold text-center"
                  aria-label="Get Merch"
                >
                  Get Merch 🛒
                </Link>

                {/* Previews */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="text-center">
                    {renderPreview("shirt")}
                    <div className="mt-2 text-sm text-neutral-200 font-semibold">
                      T-Shirt • AED {PRICES.shirt}
                    </div>
                  </div>
                  <div className="text-center">
                    {renderPreview("crop")}
                    <div className="mt-2 text-sm text-neutral-200 font-semibold">
                      Women Crop Top • AED {PRICES.crop}
                    </div>
                  </div>
                  <div className="text-center">
                    {renderPreview("tote")}
                    <div className="mt-2 text-sm text-neutral-200 font-semibold">
                      Tote Bag • AED {PRICES.tote}
                    </div>
                  </div>
                  <div className="text-center">
                    {renderPreview("mug")}
                    <div className="mt-2 text-sm text-neutral-200 font-semibold">
                      Mug • AED {PRICES.mug}
                    </div>
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
