'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

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

export default function ComicStoryPage() {
  const [inputs, setInputs] = useState<ComicRequest | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load inputs from localStorage
  useEffect(() => {
    try {
      const rawInputs = localStorage.getItem('comicInputs');
      const selfieUrl = localStorage.getItem('selfieUrl');
      if (!rawInputs || !selfieUrl) {
        setError('Missing comic inputs or selfie. Please go back and try again.');
        return;
      }

      const parsed = JSON.parse(rawInputs);
      const fullInputs: ComicRequest = { ...parsed, selfieUrl };

      setInputs(fullInputs);

      const storyBeats = [
        {
          caption: `Issue 01 — ${parsed.lesson}`,
          prompt: `Cover prompt for ${parsed.lesson}`,
        },
        {
          caption: `Origin: Shaped by ${parsed.childhood}`,
          prompt: `Flashback to childhood home, selfie face fused`,
        },
        {
          caption: `Catalyst: Embrace the power of ${parsed.superpower}`,
          prompt: `Hero landing in leotard, full body, ${parsed.superpower} effects`,
        },
        {
          caption: `Conflict: Confront fear of ${parsed.fear}`,
          prompt: `Close-up trembling hand, then neon-glow fist`,
        },
        {
          caption: `Climax: Triumph with ${parsed.superpower}`,
          prompt: `Power blast striking wraith in city center`,
        },
        {
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `Sunrise cityscape and silhouette rooftop`,
        },
      ];

      setPanels(storyBeats.map((p, i) => ({ id: i, ...p })));
    } catch {
      setError('Invalid or corrupted data. Please restart.');
    }
  }, []);

  const generateAll = async () => {
    if (!inputs) return;
    setLoading(true);

    try {
      const updatedPanels = await Promise.all(
        panels.map(async (panel) => {
          const res = await fetch('/api/generate-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: panel.prompt,
              selfieUrl: inputs.selfieUrl,
            }),
          });

          const json = await res.json();
          return { ...panel, imageUrl: json.comicImageUrl };
        })
      );
      setPanels(updatedPanels);
    } catch (err) {
      setError('Something went wrong while generating story panels.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center">📖 Your Hero’s Origin Story</h1>

      {error && <p className="text-red-400 text-center">{error}</p>}

      <div className="text-center">
        <button
          onClick={generateAll}
          disabled={loading || panels.every((p) => p.imageUrl)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-lg"
        >
          {loading ? 'Generating Story Panels…' : 'Generate My Story'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {panels.map((panel) => (
          <div key={panel.id} className="rounded overflow-hidden shadow-lg bg-white text-black">
            {panel.imageUrl ? (
              <Image
                src={panel.imageUrl}
                alt={`Panel ${panel.id + 1}`}
                width={800}
                height={1000}
                className="w-full h-auto object-cover"
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center bg-gray-200">
                <p className="text-gray-600">Waiting for panel {panel.id + 1}…</p>
              </div>
            )}
            <div className="p-4">
              <h2 className="font-bold text-xl">{panel.caption}</h2>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
