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

      const costumeDesc = `the exact superhero costume from the cover: iconic wind-themed suit, flowing cape, shining emblem`;
      const pronoun = parsed.gender.toLowerCase() === 'male' ? 'his' : parsed.gender.toLowerCase() === 'female' ? 'her' : 'their';

      // Story flavor: secondary characters
      const companion = "their closest companion, a loyal and courageous friend always offering support";
      const rival = "a mysterious rival, cunning and ever-watchful in the background";

      const storyBeats: Panel[] = [
        // Panel 1: The cover (display only)
        {
          id: 0,
          caption: `Issue 01 — ${parsed.lesson}`,
          imageUrl: coverImageUrl,
        },
        // Panel 2: Origin Story - childhood in regular clothes
        {
          id: 1,
          caption: `Origin: Shaped by ${parsed.childhood}`,
          prompt: `
A rich and cinematic flashback to the hero's childhood in ${parsed.city}. The young hero, whose face and hair perfectly match the adult version from the cover, is shown in ordinary, age-appropriate clothes—perhaps a hoodie, jeans, or school uniform—blending into a lively city street, playground, or humble apartment. The atmosphere is colored by the feeling of ${parsed.childhood}, with little signs of struggle (like worn shoes or patched clothes), but also hope. Their closest companion, a trusted friend, is nearby, sharing in the day's adventure or quietly offering support. The hero's posture and eyes reveal both vulnerability and early signs of resilience. City details in the background anchor the story in ${parsed.city}. 1980s comic art style, warm and nostalgic lighting, no text on image.
          `.trim(),
        },
        // Panel 3: Catalyst (Discovery of Power)
        {
          id: 2,
          caption: `Catalyst: Discovers the power of ${parsed.superpower}`,
          prompt: `
A pulse-pounding rooftop scene at dusk in ${parsed.city}. The hero, now a teenager, unleashes their superpower—${parsed.superpower}—for the first time. Objects around them are caught in the wind's spiral, hair and clothes billowing. Their companion watches in wide-eyed awe, while their mysterious rival, partly obscured by shadow, observes from a nearby rooftop. The hero's face and hairstyle are exactly as on the cover. Energy crackles in the air, lights of the city blur below. Vivid action, 1980s comic drama, no text.
          `.trim(),
        },
        // Panel 4: Conflict (Facing Fear)
        {
          id: 3,
          caption: `Conflict: Faces fear of ${parsed.fear}`,
          prompt: `
A tense, neon-lit night in downtown ${parsed.city}. The hero stands on rain-slick pavement, wrestling internally with the fear of ${parsed.fear}. Their companion is reaching out in concern, while the rival steps forward from the shadows, attempting to exploit the hero's doubt. Reflections ripple in puddles, streetlights cast dramatic shadows, and city traffic blurs in the background. The hero’s costume, face, and hair match the cover perfectly. Emotionally charged, deep cinematic colors, 1980s comic style, no text.
          `.trim(),
        },
        // Panel 5: Climax (Triumph)
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
A breathtaking battle in the city square of ${parsed.city}. The hero, empowered by ${parsed.strength} and memories of ${parsed.fuel}, faces off against their rival in a whirlwind of wind & energy. Citizens—including the companion—cheer and take shelter as the hero turns the tide. The hero’s costume and features are identical to the cover. The rival is finally overwhelmed and recedes into the background. Debris and swirling light fill the scene. The hero stands victorious, striking a bold pose. 1980s comic style, electric colors, no text.
          `.trim(),
        },
        // Panel 6: Resolution (Lesson)
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
Sunrise bathes the rooftops of ${parsed.city} in golden light. The hero stands shoulder-to-shoulder with their closest companion, both gazing out at the peaceful city below. The hero’s face and costume match the cover exactly, radiating calm and confidence. The rival is now a distant, harmless silhouette on another rooftop. The scene is serene, hopeful, and reflective, embodying the lesson: "${parsed.lesson}". Uplifting 1980s comic art, soft and cinematic, no text on image.
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
