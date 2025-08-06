'use client';

import { useEffect, useState } from 'react';

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
  prompt?: string;
  imageUrl?: string;
}

export default function ComicStoryPage() {
  const [inputs, setInputs] = useState<ComicRequest | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const rawInputs = localStorage.getItem('comicInputs');
      const coverImageUrl = localStorage.getItem('coverImageUrl');
      if (!rawInputs || !coverImageUrl) {
        setError('Missing comic inputs or cover image. Please go back and try again.');
        return;
      }
      const parsed: ComicRequest = JSON.parse(rawInputs);

      setInputs({ ...parsed, selfieUrl: parsed.selfieUrl });

      const costumeDesc = `the hero’s face, hair, and superhero costume are exactly the same as the comic cover image, maintaining perfect visual consistency`;
      const pronoun = parsed.gender.toLowerCase() === 'male' ? 'his' : parsed.gender.toLowerCase() === 'female' ? 'her' : 'their';

      const companion = "their loyal best friend, always supporting from the sidelines";
      const rival = "their mysterious rival, filled with dark ambition";

      const storyBeats: Panel[] = [
        // Panel 1: The cover (display only)
        {
          id: 0,
          caption: `Issue 01 — ${parsed.lesson}`,
          imageUrl: coverImageUrl,
        },
        // Panel 2: Origin — Childhood, Regular Clothes
        {
          id: 1,
          caption: `Origin: Shaped by ${parsed.childhood}`,
          prompt: `
A nostalgic, golden-hour flashback. The young hero is shown sitting on old steps, wearing ordinary childhood clothes (like jeans, hoodie, worn sneakers), not in costume. ${companion} is nearby, listening or sharing a quiet moment. Visual hints of ${parsed.childhood}—like a patched backpack or faded photograph—add emotional depth. The hero's face and hair match the cover image but shown in profile or thoughtful three-quarters view, gazing ahead. Urban textures and soft sunlight. No superhero costume. 1980s comic art, no text.
          `.trim(),
        },
        // Panel 3: Catalyst — First Power
        {
          id: 2,
          caption: `Catalyst: The spark of ${parsed.superpower}`,
          prompt: `
A dramatic stormy evening. The hero, now older, is caught in the moment of discovering ${parsed.superpower}: wind and debris swirl around as their hair and costume ripple with energy. ${companion} shields their face, startled, while ${rival} lurks atop a distant fire escape, eyes fixed on the hero. The hero’s face and costume are a perfect match to the comic cover. Action shot from a diagonal or three-quarters angle—pure motion, energy, and awe. 1980s comic art, no text.
          `.trim(),
        },
        // Panel 4: Conflict — Facing Fear, Cinematic Angle
        {
          id: 3,
          caption: `Conflict: Faces the fear of ${parsed.fear}`,
          prompt: `
A neon-lit alley at midnight. The hero stands face-to-face with ${rival}, posture tense and ready. This time, the hero is viewed in dramatic three-quarters or profile angle—jaw clenched, eyes fierce, every detail of the face, hair, and costume *identical to the comic cover*. ${companion} is visible at the edge, worried but hopeful. Reflections and shadows create an intense, cinematic mood. Every visual detail—costume, hair, emotion—stays perfectly true to the comic cover. Gritty, emotional, 80s comic book style, no text.
          `.trim(),
        },
        // Panel 5: Climax — Triumph
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
In a blaze of energy, the hero unleashes the full power of ${parsed.strength} in a crowded city square. The hero is seen leaping or standing tall in a powerful side or action pose, costume, face, and hair perfectly matching the comic cover. ${rival} is knocked backward in defeat; the crowd (including the companion) reacts in awe and celebration. Debris and light swirl, the scene feels heroic and cinematic. Costuming and face details remain identical to the cover image. Iconic 1980s comic art, no text.
          `.trim(),
        },
        // Panel 6: Resolution — Lesson, City at Dawn
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
Dawn breaks over the skyline of ${parsed.city}. The hero stands alone on a high rooftop, cape and costume exactly as on the comic cover, gazing out at the waking city. The rival and companion are gone—the hero’s silhouette is iconic, posture calm and reflective. The lesson "${parsed.lesson}" is written in the peaceful stance and subtle facial expression. The city’s famous buildings and morning glow create a sense of hope and new beginnings. No costume changes, all details match the cover. Poetic, cinematic 1980s comic book art, no text.
          `.trim(),
        },
      ];

      setPanels(storyBeats);
    } catch {
      setError('Invalid or corrupted data. Please restart.');
    }
  }, []);

  // Only generate panels 2+
  const generateAll = async () => {
    if (!inputs) return;
    setLoading(true);
    setError(null);

    const coverImageUrl = localStorage.getItem('coverImageUrl');
    if (!coverImageUrl) {
      setError('Cover image not found! Please generate the cover first.');
      setLoading(false);
      return;
    }

    try {
      const generatedPanels: Panel[] = [panels[0]]; // Start with cover panel

      for (let i = 1; i < panels.length; i++) {
        const panel = panels[i];
        const res = await fetch('/api/generate-multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: panel.prompt,
            inputImageUrl: coverImageUrl, // Always use the cover as input_image
          }),
        });
        const json = await res.json();
        generatedPanels.push({ ...panel, imageUrl: json.comicImageUrl });
      }

      setPanels(generatedPanels);
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
          disabled={loading || panels.slice(1).every((p) => p.imageUrl)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-lg"
        >
          {loading ? 'Generating Story Panels…' : 'Generate My Story'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {panels.map((panel) => (
          <div key={panel.id} className="rounded overflow-hidden shadow-lg bg-white text-black">
            {panel.imageUrl ? (
              <img
                src={panel.imageUrl}
                alt={`Panel ${panel.id + 1}`}
                width={800}
                height={1000}
                className="w-full h-auto object-cover rounded"
                style={{ background: '#f3f3f3' }}
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
