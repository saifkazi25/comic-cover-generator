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

/* ---------- Detect if the cover has a thick uniform border/alpha edges ---------- */
type CoverStyle = "bordered" | "clean";

async function detectCoverStyle(url: string): Promise<CoverStyle> {
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

    // Try blob (keeps canvas readable for CORS)
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      img = await loadAsImage(obj);
      URL.revokeObjectURL(obj);
    } catch {
      img = await loadAsImage(url);
    }

    const w = Math.min(img.naturalWidth || img.width, 800);
    const h = Math.min(img.naturalHeight || img.height, 800);
    if (!w || !h) return "clean";

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "clean";
    ctx.drawImage(img, 0, 0, w, h);

    // sample a 5% band on all four sides
    const band = Math.max(2, Math.floor(Math.min(w, h) * 0.05));
    const edges = [
      { x: 0, y: 0, w, h: band }, // top
      { x: 0, y: h - band, w, h: band }, // bottom
      { x: 0, y: 0, w: band, h }, // left
      { x: w - band, y: 0, w: band, h }, // right
    ];

    // center box to compare with edges
    const cx = Math.floor(w * 0.2);
    const cy = Math.floor(h * 0.2);
    const cw = Math.floor(w * 0.6);
    const ch = Math.floor(h * 0.6);

    const sampleMAD = (data: Uint8ClampedArray) => {
      // mean absolute deviation on luma
      let sum = 0;
      let len = 0;
      for (let i = 0; i < data.length; i += 4) {
        const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        sum += y;
        len++;
      }
      const mean = sum / Math.max(1, len);
      let mad = 0;
      for (let i = 0; i < data.length; i += 4) {
        const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        mad += Math.abs(y - mean);
      }
      return mad / Math.max(1, len);
    };

    // transparency check
    let total = 0;
    let transparent = 0;
    for (const a of edges) {
      const d = ctx.getImageData(a.x, a.y, a.w, a.h).data;
      total += d.length / 4;
      for (let i = 3; i < d.length; i += 4) {
        if (d[i] < 230) transparent++;
      }
    }
    const alphaRatio = transparent / Math.max(1, total);
    if (alphaRatio > 0.08) return "clean";

    // uniform edges vs center content
    const edgeData = ctx.getImageData(band, band, w - 2 * band, h - 2 * band).data; // big area inside edges
    const topD = ctx.getImageData(0, 0, w, band).data;
    const botD = ctx.getImageData(0, h - band, w, band).data;
    const leftD = ctx.getImageData(0, 0, band, h).data;
    const rightD = ctx.getImageData(w - band, 0, band, h).data;

    const edgeMAD =
      (sampleMAD(topD) + sampleMAD(botD) + sampleMAD(leftD) + sampleMAD(rightD)) / 4;
    const centerMAD = sampleMAD(ctx.getImageData(cx, cy, cw, ch).data);

    // Looser thresholds so we catch beige frames more often.
    // Edges very uniform (low MAD) and center more detailed => "bordered".
    if (edgeMAD < 12 && centerMAD > 14) return "bordered";

    return "clean";
  } catch {
    return "clean";
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

  // Analyze cover once it exists
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
  const PRINT_BOX: Record<
    "shirt" | "crop" | "tote" | "mug",
    { top: number; left: number; width: number; height: number; aspect: string }
  > = {
    shirt: { top: 22, left: 30, width: 40, height: 46, aspect: "aspect-[4/5]" },
    crop:  { top: 34, left: 34, width: 31, height: 42, aspect: "aspect-[5/3]" },
    // Tote bigger & centered
    tote:  { top: 46, left: 33.5, width: 33, height: 44, aspect: "aspect-[3/4]" },
    mug:   { top: 33, left: 30, width: 27, height: 34, aspect: "aspect-[5/3]" },
  };

  /** ======== Side-crop amounts (clip-path) in percent of image width ======== */
  // Crops ONLY left/right without changing aspect ratio. No stretching.
  const SIDE_CLIP_BORDERED: Record<"shirt" | "crop" | "tote" | "mug", [number, number]> = {
    shirt: [6, 6],
    crop:  [6, 6],
    tote:  [5, 5],
    mug:   [8, 8],
  };
  const SIDE_CLIP_CLEAN: Record<"shirt" | "crop" | "tote" | "mug", [number, number]> = {
    shirt: [1, 1],
    crop:  [1, 1],
    tote:  [1, 1],
    mug:   [1, 1],
  };

  // Small translation so mug print sits away from handle
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

          {/* Print area (keep full image height; crop sides via clip-path) */}
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
                // Crop only left/right edges without distortion
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
                        d="M224,202.66A53.34,53.34,0,1,0,277.34,256,53.38,53.38,0,0,0,224,202.66Zm124.71-41a54,54,0,0,0-30.21-30.21C297.61,120,224,120,224,120s-73.61,0-94.5,11.47a54,54,0,0,0-30.21,30.21C88,143.39,88,216.94,88,216.94s0,73.55,11.47,94.44A54,54,0,0,0,129.68,341.6C150.57,353.06,224,353.06,224,353.06s73.61,0,94.5-11.46a54,54,0,0,0,30.21-30.21C360,290.49,360,216.94,360,216.94S360,143.39,348.71,161.66ZM224,318.66A62.66,62.66,0,1,1,286.66,256,62.73,62.73,0,0,1,224,318.66Zm80-113.06a14.66,14.66,0,1,1,14.66-14.66A14.66,14.66,0,0,1,304,205.6Z"
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
