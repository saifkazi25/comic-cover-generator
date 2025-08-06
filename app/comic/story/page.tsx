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

      const costumeDesc = `the exact superhero costume from the cover: striking colors, wind motifs, a flowing cape, and an iconic chest emblem`;
      const pronoun = parsed.gender.toLowerCase() === 'male' ? 'his' : parsed.gender.toLowerCase() === 'female' ? 'her' : 'their';

      // Add some companions/rivals for more story flavor
      const companion = "their closest companion, a loyal and courageous friend";
      const rival = "a mysterious rival, always lurking in the shadows";

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
A richly detailed scene in ${parsed.city}, at sunset, shows the hero as a child, shaped by a life of ${parsed.childhood}. The background includes ${parsed.city} landmarks and the comforting presence of ${companion}, supporting the young hero. Despite hardship, hope glimmers in their eyes. The hero wears a child’s version of ${costumeDesc}. Their face and hair exactly match the cover, just younger. Warm golden light, deep shadows, expressive body language, 1980s comic style, no text on image.
          `.trim(),
        },
        // Panel 3: Catalyst (Discovery of Power)
        {
          id: 2,
          caption: `Catalyst: Discovers the power of ${parsed.superpower}`,
          prompt: `
A dramatic moment set on a windy rooftop in ${parsed.city}. The hero stands in shock as they unleash their ${parsed.superpower} for the first time, wind swirling around them. ${companion} looks on in astonishment, while ${rival} is glimpsed far in the background, observing with envy. The costume, face, and hair all match the cover perfectly. The city skyline glows in the dusk. Intense, dynamic motion, classic 80s comic art, no text on image.
          `.trim(),
        },
        // Panel 4: Conflict (Facing Fear)
        {
          id: 3,
          caption: `Conflict: Faces fear of ${parsed.fear}`,
          prompt: `
A suspenseful night scene in downtown ${parsed.city}. The hero stands beneath neon lights, visibly struggling as they confront their deepest fear: ${parsed.fear}. ${rival} now appears closer, attempting to exploit the hero's vulnerability, while ${companion} offers encouragement from behind. The hero's costume and appearance perfectly match the cover. The air is tense with shadow and drama. Cinematic lighting, rich color, powerful emotion, 1980s comic style, no text.
          `.trim(),
        },
        // Panel 5: Climax (Triumph)
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
In a city square filled with chaos, the hero rallies with ${parsed.strength}, inspired by memories of ${parsed.fuel} and cheered on by ${companion}. ${rival} is finally defeated, vanishing into the background as the hero saves ${parsed.city} from disaster. Winds swirl, people rejoice. The hero stands triumphant, costume and face identical to the cover. Lighting is epic and victorious, 80s comic grandeur, no text.
          `.trim(),
        },
        // Panel 6: Resolution (Lesson)
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
At dawn, on a high rooftop in ${parsed.city}, the hero and ${companion} gaze out over the peaceful city. The hero’s pose is relaxed but heroic, reflecting on the lesson: "${parsed.lesson}". Their appearance and costume exactly match the cover. The sky is bright, hopeful, and serene. ${rival} is only a distant silhouette, no longer a threat. Cinematic 1980s comic art, warm golden glow, no text.
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
