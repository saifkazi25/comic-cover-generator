// app/comic/story/ComicStoryClient.tsx
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface ComicRequest {
  gender: string;
  childhood: string;
  superpower: string;
  city: string;
  fear: string;
  fuel: string;
  strength: string;
  lesson: string;
  selfieUrl: string;
}

interface Panel {
  id: number;
  caption: string;
  prompt: string;
  imageUrl?: string;
}

export default function ComicStoryClient({ data }: { data?: string }) {
  const [inputs, setInputs] = useState<ComicRequest | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);

  // Decode inputs & build initial panel list
  useEffect(() => {
    if (!data) return;
    try {
      const decoded = JSON.parse(
        decodeURIComponent(data)
      ) as Partial<ComicRequest>;
      console.log("Decoded payload:", decoded);

      // Ensure selfieUrl is present (fallback to localStorage if needed)
      const storedSelfie = localStorage.getItem("selfieUrl") || "";
      const selfieUrl = decoded.selfieUrl || storedSelfie;
      if (!decoded.selfieUrl && selfieUrl) {
        // seed localStorage for future runs
        localStorage.setItem("selfieUrl", selfieUrl);
      }

      const merged: ComicRequest = {
        gender: decoded.gender!,
        childhood: decoded.childhood!,
        superpower: decoded.superpower!,
        city: decoded.city!,
        fear: decoded.fear!,
        fuel: decoded.fuel!,
        strength: decoded.strength!,
        lesson: decoded.lesson!,
        selfieUrl,
      };

      setInputs(merged);

      const beats = [
        {
          caption: `Issue 01 — ${merged.lesson}`,
          prompt: `Cover prompt for ${merged.lesson}`,
        },
        {
          caption: `Origin: Shaped by ${merged.childhood}`,
          prompt: `Flashback to childhood home, selfie face fused`,
        },
        {
          caption: `Catalyst: Embrace the power of ${merged.superpower}`,
          prompt: `Hero landing in leotard, full body, ${merged.superpower} effects`,
        },
        {
          caption: `Conflict: Confront fear of ${merged.fear}`,
          prompt: `Close-up trembling hand, then neon-glow fist`,
        },
        {
          caption: `Climax: Triumph with ${merged.superpower}`,
          prompt: `Power blast striking wraith in city center`,
        },
        {
          caption: `Resolution: Lesson – ${merged.lesson}`,
          prompt: `Sunrise cityscape and silhouette rooftop`,
        },
      ];

      setPanels(beats.map((p, i) => ({ id: i, ...p })));
    } catch (e) {
      console.error("Invalid data payload:", e);
    }
  }, [data]);

  // Fire off all panel generations in parallel
  const generateAll = async () => {
    if (!inputs) return;
    setLoading(true);

    try {
      const fetched = await Promise.all(
        panels.map(async (panel) => {
          const res = await fetch("/api/generate-multi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: panel.prompt,
              selfieUrl: inputs.selfieUrl,
            }),
          });
          if (!res.ok) {
            console.error(
              `Panel ${panel.id + 1} failed:`,
              await res.text()
            );
            return panel;
          }
          const json = await res.json();
          return { ...panel, imageUrl: json.comicImageUrl };
        })
      );
      setPanels(fetched);
    } catch (err) {
      console.error("generateAll error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-8">
      <button
        disabled={loading || panels.every((p) => p.imageUrl)}
        onClick={generateAll}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? "Generating…" : "Generate Story Panels"}
      </button>

      {panels.map((panel) => (
        <div
          key={panel.id}
          className="border rounded shadow-lg overflow-hidden"
        >
          {panel.imageUrl ? (
            <Image
              src={panel.imageUrl}
              alt={`Panel ${panel.id + 1}`}
              width={600}
              height={800}
              className="w-full object-cover"
            />
          ) : (
            <div className="w-full h-80 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">
                Waiting for panel {panel.id + 1}…
              </span>
            </div>
          )}
          <div className="p-2 bg-white">
            <p className="font-bold">{panel.caption}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
