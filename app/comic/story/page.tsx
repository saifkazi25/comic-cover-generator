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
  const [hasGenerated, setHasGenerated] = useState(false);

  // Setup story beats and inputs
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

      // Companions and rivals for more flavor
      const companion = "their loyal best friend";
      const rival = "their mysterious rival, eyes burning with jealousy";

      const storyBeats: Panel[] = [
        // Panel 1: Cover (display only)
        {
          id: 0,
          caption: `Issue 01 — ${parsed.lesson}`,
          imageUrl: coverImageUrl,
        },
        // Panel 2: Origin
        {
          id: 1,
          caption: `Origin: Shaped by ${parsed.childhood}`,
          prompt: `
A golden flashback. The young hero sits sideways on old playground equipment, in ordinary childhood clothes, clutching a memento that represents "${parsed.childhood}". ${companion} is nearby, offering silent support. The hero’s face and hair echo the cover but are shown in profile, gaze lost in memory. The background is a faded corner of ${parsed.city}—maybe cracked pavement and playground shadows. No superhero costume. Cinematic, 80s comic art, no text.
          `.trim(),
        },
        // Panel 3: Catalyst — Park Version
        {
          id: 2,
          caption: `Catalyst: Awakening of ${parsed.superpower}`,
          prompt: `
On a sun-drenched afternoon in the heart of ${parsed.city}, the hero moves through a lively city park filled with families, children playing, and people lounging on picnic blankets. Suddenly, as laughter and music float through the air, ${parsed.superpower} bursts to life for the first time—${parsed.superpower} ripple across the grass, sending kites, leaves, and flower petals flying in a dazzling swirl. The hero is caught in a dynamic three-quarters pose, awe and surprise lighting up their face as nearby people gasp and scatter in amazement. ${companion} peeks out from behind a park bench, eyes wide. The rival lurks under the shade of a distant tree, half-hidden. No front-facing pose, no rooftops or city streets. Bright, cinematic, 80s comic art, no text.
          `.trim(),
        },
        // Panel 4: Conflict — Face to Face, Fear Embodied
        {
          id: 3,
          caption: `Conflict: Confronting the Fear of ${parsed.fear}`,
          prompt: `
In a rain-soaked alley, the hero stands face-to-face with the rival—who now embodies the monstrous form of "${parsed.fear}". Both are shown in profile or dramatic three-quarters view, inches apart, tension crackling. The hero’s costume, face, and hair match the cover, but fear is written in every feature—trembling hands, sweat, clenched jaw. The alley is lined with glowing signs, puddles reflecting twisted shapes. ${companion} is distant, blurred. No backs to camera. Pure confrontation, psychological drama, 80s comic art, no text.
          `.trim(),
        },
        // Panel 5: Climax — Triumph, Unique City-inspired Location, Cheering Crow
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
In the middle of a bustling street or open plaza in ${parsed.city}, surrounded by amazed pedestrians, the hero unleashes the full force of ${parsed.strength} to finally overcome the rival, who embodies the monstrous form of "${parsed.fear}". In a dynamic side pose—not facing forward—the hero sends the rival tumbling into swirling shadows, broken symbols of "${parsed.fear}" scattering across the pavement. ${companion} cheers from the crowd, arms raised in triumph. Nearby, a crow flaps its wings and caws joyfully, clearly celebrating the hero’s victory. Local city details—street signs, colorful market stalls, vibrant banners—fill the background. Dramatic, hopeful, energetic 80s comic art, no text.
          `.trim(),
        },
        // Panel 6: Resolution — Different Pose, City at Dawn
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
At dawn, the hero stands or sits sideways atop a building ledge in ${parsed.city}, cape fluttering, hands resting on knees or arms folded, gazing out over the waking city. The pose is calm, reflective, NOT the same as the cover—never facing the viewer. The skyline is detailed with local landmarks. The hero’s lesson "${parsed.lesson}" is felt in posture and the peaceful golden light. The rival and companion are absent, the hero is alone. Cinematic, iconic, 80s comic art, no text.
          `.trim(),
        },
      ];

      setPanels(storyBeats);
    } catch {
      setError('Invalid or corrupted data. Please restart.');
    }
  }, []);

  // Auto-generate panels as soon as storyBeats are set (after cover)
  useEffect(() => {
    const autoGenerate = async () => {
      if (!inputs || panels.length === 0 || panels[0]?.imageUrl === undefined || hasGenerated) return;

      setLoading(true);
      setError(null);

      const coverImageUrl = localStorage.getItem('coverImageUrl');
      if (!coverImageUrl) {
        setError('Cover image not found! Please generate the cover first.');
        setLoading(false);
        return;
      }

      try {
        const generatedPanels: Panel[] = [panels[0]];

        for (let i = 1; i < panels.length; i++) {
          const panel = panels[i];
          const res = await fetch('/api/generate-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: panel.prompt,
              inputImageUrl: coverImageUrl,
            }),
          });
          const json = await res.json();
          generatedPanels.push({ ...panel, imageUrl: json.comicImageUrl });
        }

        setPanels(generatedPanels);
        setHasGenerated(true);
      } catch (err) {
        setError('Something went wrong while generating story panels.');
      } finally {
        setLoading(false);
      }
    };

    // Run auto-generate if not already run
    if (
      panels.length > 1 &&
      panels[0].imageUrl &&
      !panels[1]?.imageUrl && // Only trigger if story panels haven't been generated
      !hasGenerated
    ) {
      autoGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, panels, hasGenerated]);

  return (
    <div className="p-4 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center">📖 Your Hero’s Origin Story</h1>

      {error && <p className="text-red-400 text-center">{error}</p>}

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
      {loading && (
        <div className="text-center text-lg text-blue-300">Generating Story Panels…</div>
      )}
    </div>
  );
}
