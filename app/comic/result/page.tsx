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

/**
 * (1) Heuristic matte detector (backstop)
 */
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
      img = await loadAsImage(url);
    }

    const w = Math.min(img.naturalWidth || img.width, 1200);
    const h = Math.min(img.naturalHeight || img.height, 1200);
    if (!w || !h) return SAFE_FALLBACK;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return SAFE_FALLBACK;

    ctx.drawImage(img, 0, 0, w, h);

    const edgeBand = Math.max(2, Math.floor(Math.min(w, h) * 0.1));
    const innerBand = Math.max(2, Math.floor(Math.min(w, h) * 0.05));
    const thin = Math.max(2, Math.floor(Math.min(w, h) * 0.02));

    const stats = (data: Uint8ClampedArray) => {
      let n = 0,
        ySum = 0,
        ySq = 0,
        aSum = 0,
        rSum = 0,
        gSum = 0,
        bSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2],
          a = data[i + 3];
        const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        ySum += y;
        ySq += y * y;
        aSum += a;
        rSum += r;
        gSum += g;
        bSum += b;
        n++;
      }
      const meanY = ySum / Math.max(1, n);
      const varY = Math.max(0, ySq / Math.max(1, n) - meanY * meanY);
      const stdY = Math.sqrt(varY);
      return {
        meanA: aSum / Math.max(1, n),
        meanY,
        stdY,
        meanR: rSum / Math.max(1, n),
        meanG: gSum / Math.max(1, n),
        meanB: bSum / Math.max(1, n),
      };
    };

    // Edge areas
    const topE = ctx.getImageData(0, 0, w, edgeBand).data;
    const botE = ctx.getImageData(0, h - edgeBand, w, edgeBand).data;
    const lefE = ctx.getImageData(0, 0, edgeBand, h).data;
    const rigE = ctx.getImageData(w - edgeBand, 0, edgeBand, h).data;

    // Inner ring
    const topI = ctx.getImageData(0, edgeBand, w, innerBand).data;
    const botI = ctx.getImageData(0, h - edgeBand - innerBand, w, innerBand).data;
    const lefI = ctx.getImageData(edgeBand, 0, innerBand, h).data;
    const rigI = ctx.getImageData(w - edgeBand - innerBand, 0, innerBand, h).data;

    // Thin edge vs next strips
    const s = (x: number, y: number, ww: number, hh: number) =>
      stats(ctx.getImageData(x, y, ww, hh).data);
    const leftThinE = s(0, 0, thin, h),
      leftThinN = s(thin, 0, thin, h);
    const rightThinE = s(w - thin, 0, thin, h),
      rightThinN = s(w - thin * 2, 0, thin, h);
    const topThinE = s(0, 0, w, thin),
      topThinN = s(0, thin, w, thin);
    const botThinE = s(0, h - thin, w, thin),
      botThinN = s(0, h - thin * 2, w, thin);

    // Center
    const cx = Math.floor(w * 0.18),
      cy = Math.floor(h * 0.18);
    const cw = Math.floor(w * 0.64),
      ch = Math.floor(h * 0.64);
    const sCen = stats(ctx.getImageData(cx, cy, cw, ch).data);

    const sTopE = stats(topE),
      sBotE = stats(botE),
      sLefE = stats(lefE),
      sRigE = stats(rigE);
    const sTopI = stats(topI),
      sBotI = stats(botI),
      sLefI = stats(lefI),
      sRigI = stats(rigI);

    const edgeAlpha =
      (sTopE.meanA + sBotE.meanA + sLefE.meanA + sRigE.meanA) / 4 / 255;
    if (edgeAlpha < 0.85) return "clean";

    const edgeStd = (sTopE.stdY + sBotE.stdY + sLefE.stdY + sRigE.stdY) / 4;
    const distRGB = (a: any, b: any) =>
      Math.hypot(a.meanR - b.meanR, a.meanG - b.meanG, a.meanB - b.meanB);
    const edgeSpread =
      (distRGB(sTopE, sBotE) +
        distRGB(sTopE, sLefE) +
        distRGB(sTopE, sRigE) +
        distRGB(sLefE, sRigE)) /
      4;

    const lumaDiffEdgeInner =
      (Math.abs(sTopE.meanY - sTopI.meanY) +
        Math.abs(sBotE.meanY - sBotI.meanY) +
        Math.abs(sLefE.meanY - sLefI.meanY) +
        Math.abs(sRigE.meanY - sRigI.meanY)) /
      4;

    const colorDiffEdgeInner =
      (distRGB(sTopE, sTopI) +
        distRGB(sBotE, sBotI) +
        distRGB(sLefE, sLefI) +
        distRGB(sRigE, sRigI)) /
      4;

    const thinLumaJumpAvg =
      (Math.abs(leftThinE.meanY - leftThinN.meanY) +
        Math.abs(rightThinE.meanY - rightThinN.meanY) +
        Math.abs(topThinE.meanY - topThinN.meanY) +
        Math.abs(botThinE.meanY - botThinN.meanY)) /
      4;

    const thinEdgeStdAvg =
      (leftThinE.stdY + rightThinE.stdY + topThinE.stdY + botThinE.stdY) / 4;

    const edgeMeanY =
      (sTopE.meanY + sBotE.meanY + sLefE.meanY + sRigE.meanY) / 4;
    const veryBrightFlat = edgeMeanY > 230 && edgeStd < 12;
    const veryDarkFlat = edgeMeanY < 20 && edgeStd < 12;

    const centerStd = sCen.stdY;

    const BORDERED =
      veryBrightFlat ||
      veryDarkFlat ||
      (thinLumaJumpAvg > 6 && thinEdgeStdAvg < 10) ||
      (edgeStd < 18 && (lumaDiffEdgeInner > 6 || colorDiffEdgeInner > 14)) ||
      (edgeStd < 24 && centerStd > edgeStd + 3) ||
      (edgeStd < 12 && edgeSpread < 18);

    return BORDERED ? "bordered" : "clean";
  } catch {
    return SAFE_FALLBACK;
  }
}

/**
 * (2) Exact side matte measurement — symmetric, smoothed, percentile-based.
 * Returns [left%, right%] to crop.
 */
async function measureSideMatte(url: string): Promise<[number, number]> {
  const loadAsImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
  const quantile = (arr: number[], q: number) => {
    if (!arr.length) return 0;
    const a = [...arr].sort((x, y) => x - y);
    const idx = clamp((a.length - 1) * q, 0, a.length - 1);
    const lo = Math.floor(idx),
      hi = Math.ceil(idx);
    if (lo === hi) return a[lo];
    const t = idx - lo;
    return a[lo] * (1 - t) + a[hi] * t;
  };

  try {
    let img: HTMLImageElement;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      img = await loadAsImage(obj);
      URL.revokeObjectURL(obj);
    } catch {
      img = await loadAsImage(url);
    }

    // Resize for speed
    const targetW = 448; // a bit smaller = quicker, still accurate
    const scale = (img.naturalWidth || img.width) / targetW;
    const w = targetW;
    const h = Math.max(80, Math.round((img.naturalHeight || img.height) / scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [0, 0];

    ctx.drawImage(img, 0, 0, w, h);

    // Analyze center band (avoid logos/bleeds)
    const y0 = Math.floor(h * 0.2);
    const y1 = Math.floor(h * 0.8);
    const bandH = y1 - y0;
    const band = ctx.getImageData(0, y0, w, bandH).data;

    // Column features
    const colMean = new Array<number>(w).fill(0);
    const colStd = new Array<number>(w).fill(0);
    for (let x = 0; x < w; x++) {
      let n = 0,
        sum = 0,
        sumSq = 0;
      for (let yy = 0; yy < bandH; yy++) {
        const base = (yy * w + x) * 4;
        const r = band[base],
          g = band[base + 1],
          b = band[base + 2];
        const yL = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        sum += yL;
        sumSq += yL * yL;
        n++;
      }
      const mean = sum / Math.max(1, n);
      const varY = Math.max(0, sumSq / Math.max(1, n) - mean * mean);
      colMean[x] = mean;
      colStd[x] = Math.sqrt(varY);
    }

    // Gradient over a few px
    const STEP = 4;
    const grad = new Array<number>(w).fill(0);
    for (let x = 0; x < w; x++) {
      const nx = Math.min(w - 1, x + STEP);
      grad[x] = Math.abs(colMean[x] - colMean[nx]);
    }

    // Busy score = normalized std + normalized grad
    const stdP95 = quantile(colStd, 0.95) || 1;
    const gradP95 = quantile(grad, 0.95) || 1;
    const score = new Array<number>(w);
    for (let x = 0; x < w; x++) {
      const sStd = colStd[x] / stdP95; // ~[0..1+] robust scaling
      const sGrad = grad[x] / gradP95;
      score[x] = 0.8 * sStd + 0.9 * sGrad;
    }

    // Smooth
    const WIN = 7,
      half = Math.floor(WIN / 2);
    const sSmooth = new Array<number>(w).fill(0);
    for (let i = 0; i < w; i++) {
      let s = 0,
        c = 0;
      for (let k = -half; k <= half; k++) {
        const j = i + k;
        if (j >= 0 && j < w) {
          s += score[j];
          c++;
        }
      }
      sSmooth[i] = s / Math.max(1, c);
    }

    // Threshold from percentiles (adapts to plain mattes)
    const t50 = quantile(sSmooth, 0.5);
    const t85 = quantile(sSmooth, 0.85);
    const THRESH = t50 * 0.4 + t85 * 0.6; // skew toward higher “busy”

    // Find sustained busy zones at both sides
    const REQUIRE_CONSEC = 3;
    const MAX_CHECK = Math.floor(w * 0.35);

    const findLeft = () => {
      let consec = 0;
      for (let x = 0; x < MAX_CHECK; x++) {
        consec = sSmooth[x] > THRESH ? consec + 1 : 0;
        if (consec >= REQUIRE_CONSEC) return Math.max(0, x - (REQUIRE_CONSEC - 1));
      }
      return 0;
    };
    const findRight = () => {
      let consec = 0;
      for (let x = w - 1; x >= w - MAX_CHECK; x--) {
        consec = sSmooth[x] > THRESH ? consec + 1 : 0;
        if (consec >= REQUIRE_CONSEC)
          return Math.max(0, w - 1 - x - (REQUIRE_CONSEC - 1));
      }
      return 0;
    };

    let leftPx = findLeft();
    let rightPx = findRight();

    // If one side looks good but the other didn't trigger, mirror conservatively
    let leftPct = (leftPx / w) * 100;
    let rightPct = (rightPx / w) * 100;

    const goodL = leftPct >= 3;
    const goodR = rightPct >= 3;

    if (goodL && !goodR) rightPct = Math.min(14, leftPct * 0.95);
    if (goodR && !goodL) leftPct = Math.min(14, rightPct * 0.95);

    // Clamp & cap (avoid over-cropping)
    leftPct = clamp(leftPct, 0, 18);
    rightPct = clamp(rightPct, 0, 18);

    return [leftPct, rightPct];
  } catch {
    return [0, 0];
  }
}

/* ---------- Cloudinary helpers: JPEG + watermark overlay ---------- */
function addCloudinaryTransformToJPEG(url: string, extraTransform?: string) {
  try {
    if (!url.includes("/image/upload/")) return url;
    const [prefix, rest] = url.split("/image/upload/");
    const jpeg = "f_jpg,q_auto";
    const transform = extraTransform ? `${extraTransform}/${jpeg}` : jpeg;
    return `${prefix}/image/upload/${transform}/${rest}`;
  } catch {
    return url;
  }
}

function addCloudinaryTextOverlay(
  url: string,
  text: string,
  opts: {
    font?: string;
    color?: string;
    stroke?: string;
    gravity?: string;
    x?: number;
    y?: number;
  } = {}
) {
  try {
    if (!url.includes("/image/upload/")) return url;
    const [prefix, rest] = url.split("/image/upload/");
    const font = opts.font ?? "Montserrat_700";
    const color = opts.color ?? "ffffff";
    const stroke = opts.stroke ?? "2px_solid_rgb:000000";
    const gravity = opts.gravity ?? "south_east";
    const x = opts.x ?? 20;
    const y = opts.y ?? 20;
    const encoded = encodeURIComponent(text);
    const overlay = `l_text:${font}:${encoded},co_rgb:${color},bo_${stroke}/fl_layer_apply,g_${gravity},x_${x},y_${y}`;
    return `${prefix}/image/upload/${overlay}/${rest}`;
  } catch {
    return url;
  }
}

export default function ComicResultPage() {
  const [comic, setComic] = useState<ComicResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coverStyle, setCoverStyle] = useState<CoverStyle>("clean");
  const [measuredClip, setMeasuredClip] = useState<[number, number]>([0, 0]);

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
        (data.heroName ?? data.superheroName ?? "").trim() || readHeroFromCookie();
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

  // Detect + measure matte after image arrives
  useEffect(() => {
    (async () => {
      if (!comic?.comicImageUrl) return;
      const [style, sides] = await Promise.all([
        detectCoverStyle(comic.comicImageUrl),
        measureSideMatte(comic.comicImageUrl),
      ]);
      setCoverStyle(style);
      setMeasuredClip(sides);
    })();
  }, [comic?.comicImageUrl]);

  /* ===== Viral bits: handle + caption + watermark ===== */
  const IG_HANDLE = "@comicmypage"; // ← your IG handle
  const CAPTION = `Made my superhero cover! Try yours at ${IG_HANDLE} 🔥`;

  // Watermark the image we DISPLAY (so screenshots still promote you)
  const displayUrl = useMemo(() => {
    if (!comic?.comicImageUrl) return "";
    // bottom-right watermark with strong stroke for legibility
    const withMark = addCloudinaryTextOverlay(comic.comicImageUrl, IG_HANDLE, {
      font: "Montserrat_700",
      color: "ffffff",
      stroke: "3px_solid_rgb:000000",
      gravity: "south_east",
      x: 24,
      y: 24,
    });
    return withMark;
  }, [comic?.comicImageUrl]);

  // Build an overlayed, JPEG-converted URL we SHARE/DOWNLOAD
  const shareUrl = useMemo(() => {
    if (!comic?.comicImageUrl) return null;
    let url = comic.comicImageUrl;

    // 1) add the same watermark (permanent brand)
    url = addCloudinaryTextOverlay(url, IG_HANDLE, {
      font: "Montserrat_700",
      color: "ffffff",
      stroke: "3px_solid_rgb:000000",
      gravity: "south_east",
      x: 24,
      y: 24,
    });

    // 2) optional tiny caption sticker (kept subtle)
    url = addCloudinaryTextOverlay(url, "Become a Superhero!", {
      font: "Montserrat_600_italic",
      color: "ffffff",
      stroke: "2px_solid_rgb:000000",
      gravity: "south_west",
      x: 24,
      y: 24,
    });

    // 3) ensure JPEG for Web Share files
    url = addCloudinaryTransformToJPEG(url);

    return url;
  }, [comic?.comicImageUrl, IG_HANDLE]);

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

    // Always prep caption for paste (esp. Stories where text is ignored)
    try {
      await navigator.clipboard.writeText(CAPTION);
    } catch {}

    // Try true file-sharing first (so Instagram shows up on mobile)
    try {
      const res = await fetch(shareUrl, { mode: "cors" });
      const blob = await res.blob();
      const file = new File([blob], "superhero-cover.jpg", { type: "image/jpeg" });

      // @ts-ignore
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // @ts-ignore
        await navigator.share({
          files: [file],
          text: CAPTION, // Feed caption will include @comicmypage (clickable)
          title: "My Superhero Cover",
        });
        return;
      }
    } catch {
      // fall through
    }

    // Fallback: download + notify user caption is ready
    try {
      const res = await fetch(shareUrl, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "superhero-cover.jpg";
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();

      alert(
        `Image saved. Your caption (with ${IG_HANDLE}) is already copied—paste it in Instagram.`
      );
    } catch {
      alert(`Couldn’t prepare the share image. Caption: ${CAPTION}`);
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
    shirt: { top: 23, left: 30.5, width: 40, height: 41, aspect: "aspect-[4/5]" },
    crop: { top: 34, left: 34, width: 31, height: 42, aspect: "aspect-[5/3]" },
    tote: { top: 48, left: 31, width: 39, height: 32, aspect: "aspect-[3/4]" },
    mug: { top: 32, left: 29, width: 30, height: 37, aspect: "aspect-[5/3]" },
  };

  /** ======== Side-crop baselines (clip-path) in % of image width ======== */
  const SIDE_CLIP_BORDERED: Record<
    "shirt" | "crop" | "tote" | "mug",
    [number, number]
  > = {
    shirt: [11, 11],
    crop: [10, 10],
    tote: [12, 12],
    mug: [11, 11],
  };
  const SIDE_CLIP_CLEAN: Record<"shirt" | "crop" | "tote" | "mug", [number, number]> =
    {
      shirt: [6, 6],
      crop: [6, 6],
      tote: [6, 6],
      mug: [5, 5],
    };

  // Nudge mug art away from the handle
  const X_SHIFT: Record<"shirt" | "crop" | "tote" | "mug", number> = {
    shirt: 0,
    crop: 0,
    tote: 0,
    mug: -6,
  };

  const renderPreview = (type: "shirt" | "crop" | "tote" | "mug") => {
    // use watermarked display URL so mockups also carry your handle
    const cover = displayUrl || comic?.comicImageUrl || "";
    const bg = MOCKUPS[type];
    const box = PRINT_BOX[type];

    const base =
      (coverStyle === "bordered" ? SIDE_CLIP_BORDERED : SIDE_CLIP_CLEAN)[type];
    // final clip = max(baseline, measured) but never more than 18%
    const leftClip = Math.min(18, Math.max(base[0], measuredClip[0]));
    const rightClip = Math.min(18, Math.max(base[1], measuredClip[1]));
    const xShift = X_SHIFT[type];

    return (
      <div className="rounded-2xl bg-neutral-900/80 border border-white/10 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div
          className={`relative w-full ${box.aspect} rounded-xl overflow-hidden`}
        >
          {/* Blank product */}
          <img
            src={bg}
            alt={`${type} blank`}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false}
          />

          {/* Print area */}
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
                clipPath: `inset(0% ${rightClip}% 0% ${leftClip}%)`,
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
              src={displayUrl || comic.comicImageUrl}
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
                    <svg
                      aria-hidden="true"
                      width="22"
                      height="22"
                      viewBox="0 0 448 512"
                      className="drop-shadow"
                    >
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
                  href={`/comic/story?data=${encodeURIComponent(
                    localStorage.getItem("comicInputs") || ""
                  )}`}
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
                      <div>Women Crop Top •</div>
                      <div>AED {PRICES.crop}</div>
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
