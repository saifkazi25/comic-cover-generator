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

      const costumeDesc = `the exact superhero suit, colors, and style from the cover image—${parsed.superpower} motifs, a billowing cape, and a prominent chest emblem`;

      const pronoun = parsed.gender.toLowerCase() === 'male' ? 'his' : parsed.gender.toLowerCase() === 'female' ? 'her' : 'their';

      const storyBeats: Panel[] = [
        // Panel 1: The cover (display only)
        {
          id: 0,
          caption: `Issue 01 — ${parsed.lesson}`,
          imageUrl: coverImageUrl,
        },
        // Panel 2: Origin Story
        {
          id: 1,
          caption: `Origin: Shaped by ${parsed.childhood}`,
          prompt: `
A cinematic comic panel showing the young hero as a child in ${parsed.city}, facing a world filled with ${parsed.childhood}. The background features iconic ${parsed.city} scenery—buildings, parks, or streets recognizable to locals. The child's face and hair are unmistakably the same as the hero from the cover, just younger. The scene radiates early struggle but a spark of inner hope, foreshadowing their destiny. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} small costume is an early version of ${costumeDesc}. Dramatic 1980s comic style, golden-hour lighting, no text on image.
          `.trim(),
        },
        // Panel 3: Catalyst (Discovery of Power)
        {
          id: 2,
          caption: `Catalyst: Discovers the power of ${parsed.superpower}`,
          prompt: `
The hero stands in a stormy moment in ${parsed.city}, for the first time channeling the awesome power of ${parsed.superpower}. Wind and energy swirl, objects lift from the ground, people in the distance watch in awe. The costume, expression, and pose match the cover perfectly. The hero’s face and hair are identical to the cover. Their eyes widen in realization, and ${pronoun} energy radiates with new confidence. Lively motion, classic 80s comic drama, no text on image.
          `.trim(),
        },
        // Panel 4: Conflict (Facing Fear)
        {
          id: 3,
          caption: `Conflict: Faces fear of ${parsed.fear}`,
          prompt: `
A shadowy scene atop a skyscraper in ${parsed.city}, the hero is visibly anxious and tense, wrestling with the fear of ${parsed.fear}. The city lights glimmer far below, adding to the suspense. The hero’s costume matches the cover, and their face, posture, and hair are identical to the cover. You can see a hint of ${parsed.fuel}—the thing that keeps the hero going—even in this darkest hour. Emotional, high-contrast, 1980s comic art, no text on image.
          `.trim(),
        },
        // Panel 5: Climax (Triumph)
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
A triumphant, cinematic panel where the hero, powered by ${parsed.strength} and fueled by ${parsed.fuel}, saves ${parsed.city} from disaster. Winds and energy swirl, the sky parts, and citizens cheer in the background. The costume and face are a perfect match to the cover. The hero stands tall and confident, every detail echoing the original cover—showing the journey from struggle to victory. Bold 1980s comic style, heroic composition, no text.
          `.trim(),
        },
        // Panel 6: Resolution (Lesson)
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
A peaceful sunrise over the rooftops of ${parsed.city}, the hero stands alone, reflecting on all they've learned—"${parsed.lesson}". Their pose is relaxed yet noble. The costume and face match the cover exactly. The city below is safe thanks to the hero’s journey and choices. Warm, hopeful 1980s comic style, atmospheric and inspiring, no text.
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
