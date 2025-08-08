"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface ComicRequest {
  superheroName: string; // ✅ Added
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

  useEffect(() => {
    if (!data) return;
    try {
      const decoded = JSON.parse(decodeURIComponent(data)) as Partial<ComicRequest>;
      console.log("Decoded payload:", decoded);

      const storedSelfie = localStorage.getItem("selfieUrl") || "";
      const selfieUrl = decoded.selfieUrl || storedSelfie;
      if (!decoded.selfieUrl && selfieUrl) {
        localStorage.setItem("selfieUrl", selfieUrl);
      }

      // ✅ Pull hero name from localStorage if it wasn't passed in query
      const storedHeroName = localStorage.getItem("superheroName") || "";
      const superheroName = (decoded.superheroName || storedHeroName || "Hero").trim();
      // Persist fresh hero name if present in query
      if (decoded.superheroName && decoded.superheroName !== storedHeroName) {
        localStorage.setItem("superheroName", decoded.superheroName);
      }

      const merged: ComicRequest = {
        superheroName, // ✅ ensures we don't fall back to "Hero"
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
          caption: `Issue 01 — ${merged.superheroName}: ${merged.lesson}`,
          prompt: `Comic book cover of ${merged.superheroName}, ${merged.lesson}, 80s style, dramatic lighting`
        },
        {
          caption: `Origin: ${merged.superheroName} shaped by ${merged.childhood}`,
          prompt: `Flashback to childhood home of ${merged.superheroName}, face from selfie, nostalgic atmosphere`
        },
        {
          caption: `Catalyst: ${merged.superheroName} embraces the power of ${merged.superpower}`,
          prompt: `${merged.superheroName} in hero costume, full body, ${merged.superpower} effects`
        },
        {
          caption: `Conflict: ${merged.superheroName} confronts fear of ${merged.fear}`,
          prompt: `${merged.superheroName} facing a monstrous embodiment of ${merged.fear}, cinematic battle scene`
        },
        {
          caption: `Climax: ${merged.superheroName} triumphs with ${merged.superpower}`,
          prompt: `${merged.superheroName} unleashing ${merged.superpower} at full strength, epic city backdrop`
        },
        {
          caption: `Resolution: ${merged.superheroName} learns — ${merged.lesson}`,
          prompt: `${merged.superheroName} standing victorious at sunrise, city skyline`
        },
      ];

      setPanels(beats.map((p, i) => ({ id: i, ...p })));
    } catch (e) {
      console.error("Invalid data payload:", e);
    }
  }, [data]);

  const generateAll = async () => {
    if (!inputs) return;
    setLoading(true);
    try {
      const fetched = await Promise.all(
        panels.map(async (panel, idx) => {
          const res = await fetch("/api/generate-multi", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: panel.prompt,
              inputImageUrl: inputs.selfieUrl, // ✅ FIX: matches API param name
              userInputs: inputs,              // passes superheroName to downstream APIs
              panelIndex: idx                  // lets dialogue API know which scene
            }),
          });
          if (!res.ok) {
            console.error(`Panel ${panel.id + 1} failed:`, await res.text());
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
