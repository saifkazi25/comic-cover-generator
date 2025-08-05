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

  // Decode & build panels
  useEffect(() => {
    if (!data) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(data)) as ComicRequest;
      setInputs(decoded);
      const beats = [
        { caption: `Issue 01 — ${decoded.lesson}`, prompt: `Cover prompt for ${decoded.lesson}` },
        { caption: `Origin: Shaped by ${decoded.childhood}`, prompt: `Flashback to childhood home, selfie face fused` },
        { caption: `Catalyst: Embrace the power of ${decoded.superpower}`, prompt: `Hero landing in leotard, full body, ${decoded.superpower} effects` },
        { caption: `Conflict: Confront fear of ${decoded.fear}`, prompt: `Close-up trembling hand, then neon-glow fist` },
        { caption: `Climax: Triumph with ${decoded.superpower}`, prompt: `Power blast striking wraith in city center` },
        { caption: `Resolution: Lesson – ${decoded.lesson}`, prompt: `Sunrise cityscape and silhouette rooftop` },
      ];
      setPanels(beats.map((p, i) => ({ id: i, ...p })));
    } catch {
      console.error("Invalid data");
    }
  }, [data]);

  // Generate images
  const generateAll = async () => {
    if (!inputs) return;
    setLoading(true);
    const fetched = await Promise.all(
      panels.map(async (panel) => {
        const res = await fetch("/api/generate-multi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: panel.prompt, selfieUrl: inputs.selfieUrl }),
        });
        const json = await res.json();
        return { ...panel, imageUrl: json.comicImageUrl };
      })
    );
    setPanels(fetched);
    setLoading(false);
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
        <div key={panel.id} className="border rounded shadow-lg overflow-hidden">
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
              <span className="text-gray-500">Waiting for panel {panel.id + 1}…</span>
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
