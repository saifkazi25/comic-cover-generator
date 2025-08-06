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

      // Details for narrative flavor
      const companion = "their loyal best friend, always present";
      const rival = "their mysterious rival, eyes burning with jealousy";

      const storyBeats: Panel[] = [
        // PANEL 1: The Cover (display only)
        {
          id: 0,
          caption: `Issue 01 — ${parsed.lesson}`,
          imageUrl: coverImageUrl,
        },
        // PANEL 2: Origin (as before)
        {
          id: 1,
          caption: `Origin: Shaped by ${parsed.childhood}`,
          prompt: `
A poignant, golden flashback. The young hero sits in ordinary childhood clothes, clutching a keepsake or memento that represents "${parsed.childhood}". The environment is full of meaning: maybe a lonely playground, old photographs, or a faded sports field. ${companion} is nearby, a steady friend. The hero’s face and hair echo the cover, but this is an innocent, vulnerable moment. No superhero costume. Cinematic, emotional, 1980s comic art, no text.
          `.trim(),
        },
        // PANEL 3: Catalyst — First Power, UNIQUE SCENE
        {
          id: 2,
          caption: `Catalyst: Awakening of ${parsed.superpower}`,
          prompt: `
At the edge of a storm-battered pier or abandoned train yard, the hero stands alone, the air alive with swirling wind and crackling energy. As lightning splits the sky, the hero’s ${parsed.superpower} first erupts—waves crash, metal rattles, birds scatter, nearby streetlights flicker. The environment is chaotic: water, sky, and earth all responding to the new power. ${companion} is far off, half-sheltered under an old boat or behind debris. The rival is hidden in deep shadow. The hero’s face shows awe, terror, and exhilaration—NO superhero costume yet, just clothing torn by the storm. This discovery is raw, elemental, and unforgettable. Cinematic 80s comic art, no text.
          `.trim(),
        },
        // PANEL 4: Conflict — Rival Embodies Fear
        {
          id: 3,
          caption: `Conflict: Confronting the Fear of ${parsed.fear}`,
          prompt: `
In a dreamlike, rain-soaked alley, the hero stands locked in a showdown with the rival—who has now taken on the monstrous or symbolic form of "${parsed.fear}". Their body, shadow, or features twist into visual echoes of that fear: (think: towering, spectral, shrouded, or nightmarish). The hero’s costume, face, and hair match the comic cover, but fear is written across their features—sweat, wide eyes, trembling hands. Neon reflections flicker, and ${companion} is a blurred, distant shape. The city seems to close in, the air thick with dread. This is psychological and dramatic, the moment the hero faces what terrifies them most. Cinematic, 80s comic art, no text.
          `.trim(),
        },
        // PANEL 5: Climax — Triumph in a Symbolic Place
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
High atop a windswept bridge, rooftop, or rocky cliff edge, far above the city, the hero finally overcomes both the rival and their greatest fear: "${parsed.fear}". The rival is cast down in defeat, their form dissolving or shattering, and the hero is aglow with the energy of ${parsed.strength}, every movement charged with newfound confidence. Shattered symbols of "${parsed.fear}"—chains, masks, or shadows—scatter in the wind. ${companion} is below, watching with pride. The environment is wild and untamed, not the city square or the cover’s background. The hero’s face and costume shine with confidence and triumph. This is the hero’s world now. Dramatic, energetic, 1980s comic art, no text.
          `.trim(),
        },
        // PANEL 6: Resolution — Different Pose, City at Dawn
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
At sunrise, the hero perches alone atop a building in ${parsed.city}, cloak or jacket fluttering, seated on the ledge, or standing in a unique pose—arms crossed, one leg up, or gazing sideways—distinct from the cover image. The city of ${parsed.city} stretches out below, peaceful and bright. The hero’s face is turned to the rising sun, eyes closed or gazing into the distance, costume and hair matching the comic cover but pose unique. All is calm: the rival and companion are gone, only the lesson "${parsed.lesson}" remains, expressed in the hero’s posture and the golden light. Iconic, cinematic, 80s comic art, no text.
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
