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

      // Consistent hero design
      const costumeDesc = `the hero’s face, hair, and superhero costume are exactly the same as the comic cover image, maintaining perfect visual consistency`;
      const pronoun = parsed.gender.toLowerCase() === 'male' ? 'his' : parsed.gender.toLowerCase() === 'female' ? 'her' : 'their';

      // Character flavor
      const companion = "their loyal best friend, always present";
      const rival = "their mysterious rival, eyes burning with jealousy";

      const storyBeats: Panel[] = [
        {
          id: 0,
          caption: `Issue 01 — ${parsed.lesson}`,
          imageUrl: coverImageUrl,
        },
        {
          id: 1,
          caption: `Origin: Shaped by ${parsed.childhood}`,
          prompt: `
A poignant, golden flashback. The young hero is shown in ordinary, worn childhood clothes—perhaps clutching a small keepsake or memento that symbolizes "${parsed.childhood}". Around them, the environment tells the story: a crumpled letter, faded trophy, or lonely playground. Their best friend, ${companion}, is a comforting presence nearby. The hero’s face and hair echo the cover but are shown in profile or three-quarters view, eyes reflecting ${parsed.childhood}—loss, hope, or struggle. The scene is full of texture and emotion. No superhero costume yet. Cinematic 1980s comic art, no text.
          `.trim(),
        },
        {
          id: 2,
          caption: `Catalyst: Awakening of ${parsed.superpower}`,
          prompt: `
A sudden, electrifying moment: the hero, now older, stands in a charged pose, unleashing their true power—${parsed.superpower}—for the first time. Wind, energy, or swirling elements fill the air, objects and people are swept up. ${companion} is shocked and awestruck; the rival appears in the background, eyes narrowed. The hero’s costume and appearance perfectly match the comic cover, now glowing or crackling with new energy. The hero’s own fear and wonder flash across their face. Diagonal action angle, pure drama, 80s comic style, no text.
          `.trim(),
        },
        {
          id: 3,
          caption: `Conflict: Confronting the Fear of ${parsed.fear}`,
          prompt: `
A tense confrontation, midnight rain pouring in an empty street. The hero stands face-to-face with the rival, sweat on their brow, hands trembling—the raw, visible fear of "${parsed.fear}" is the focus. Shadows, reflections, and even graffiti or torn posters in the scene subtly echo this fear (words, images, or symbols representing "${parsed.fear}" in the background). The best friend is at a distance, reaching out in support but unable to intervene. The hero’s eyes are wide, jaw clenched, every detail of their costume, hair, and face identical to the cover image. Lightning flashes, highlighting the emotion. Deeply cinematic, emotional 80s comic art, no text.
          `.trim(),
        },
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
The hero, emboldened by the memory of ${parsed.fuel}, summons all of their ${parsed.strength} to turn the tide. They are shown in a dynamic, powerful pose—mid-leap or fists clenched—as the rival is overwhelmed, blasted back by energy or wind. The crowd and ${companion} watch in awe, faces lit with hope. The costume, face, and hair are exactly as on the cover. The moment is filled with swirling motion, city lights, and the visual symbolism of victory. 1980s comic art, no text.
          `.trim(),
        },
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
At dawn, the hero stands alone on a high rooftop overlooking ${parsed.city}, costume and face matching the comic cover. The rival and companion are gone—the hero’s pose is quiet and thoughtful, silhouetted against the city skyline. The lesson "${parsed.lesson}" is felt in the hero’s calm, uplifted posture, as sunlight spills over the buildings. The moment is serene, hopeful, and iconic. 1980s comic book style, no text.
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
