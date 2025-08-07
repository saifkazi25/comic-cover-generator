'use client';

import { useEffect, useState } from 'react';
import ComicPanel from '../../../components/ComicPanel';

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
  superheroName?: string; // Make sure you save this after cover gen!
}

interface DialogueLine {
  text: string;
  speaker: string;
}
interface Panel {
  id: number;
  prompt?: string;
  imageUrl?: string;
  dialogue?: DialogueLine[];
}

function getRivalName(fear: string) {
  if (!fear) return "Nemesis";
  let clean = fear.replace(/my\s+/i, "").replace(/[^a-zA-Z0-9 ]/g, "");
  if (clean.length < 2) clean = "Shadow";
  if (clean.split(" ").length > 1)
    return "The " + clean
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
  return "The " + clean.charAt(0).toUpperCase() + clean.slice(1);
}

export default function ComicStoryPage() {
  const [inputs, setInputs] = useState<ComicRequest | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // 1. Setup story beats and inputs
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

      // Compose story panels (cover + 5 panels, all but cover will get dialogue)
      const storyBeats: Panel[] = [
        { id: 0, imageUrl: coverImageUrl }, // Cover
        {
          id: 1,
          prompt: `A golden flashback. The young hero sits sideways on old playground equipment, in ordinary childhood clothes, clutching a memento that represents "${parsed.childhood}". Best friend is nearby, offering silent support. The hero’s face & hair echo the cover but are shown in profile, gaze lost in memory. The background is a faded corner of ${parsed.city}—maybe cracked pavement and playground shadows. No superhero costume. Cinematic, 80s comic art, no text.`,
        },
        {
          id: 2,
          prompt: `On a bright afternoon in ${parsed.city}, the hero stands in a lively city park. Families relax on picnic blankets. Children play in the distance. Suddenly, ${parsed.superpower} bursts to life for the first time. ${parsed.superpower} swirl through the grass, lifting kites and scattering flower petals. The hero is shown in a dramatic three-quarters pose, awe and surprise on their face. Nearby, best friend peeks out from behind a park bench, eyes wide. The rival watches from the shade of a tree, half-hidden. The hero’s face, hair, and costume are exactly the same as the cover image. No front-facing pose. 1980s comic art, no text.`,
        },
        {
          id: 3,
          prompt: `In a rain-soaked alley, the hero stands face-to-face with the rival—who now embodies the monstrous form of "${parsed.fear}". Both are shown in profile or dramatic three-quarters view, inches apart, tension crackling. The hero’s costume, face, and hair match the cover, but fear is written in every feature—trembling hands, sweat, clenched jaw. The alley is lined with glowing signs, puddles reflecting twisted shapes. Best friend is distant, blurred. The hero’s face, hair, and costume are exactly the same as the cover image. No backs to camera. Pure confrontation, psychological drama, 80s comic art, no text.`,
        },
        {
          id: 4,
          prompt: `In the middle of a bustling street or open plaza in ${parsed.city}, surrounded by amazed pedestrians, the hero unleashes the full force of ${parsed.strength} to finally overcome the rival, who embodies the monstrous form of "${parsed.fear}". In a dynamic side pose—not facing forward—the hero sends the rival tumbling into swirling shadows, broken symbols of "${parsed.fear}" scattering across the pavement. Best friend cheers from the crowd, arms raised in triumph. Local city details—street signs, colorful market stalls, vibrant banners—fill the background. The hero’s face, hair, and costume are exactly the same as the cover image. Dramatic, hopeful, energetic 80s comic art, no text.`,
        },
        {
          id: 5,
          prompt: `At dawn, the hero stands or sits sideways atop a building ledge in ${parsed.city}, cape fluttering, hands resting on knees or arms folded, gazing out over the waking city. The pose is calm, reflective, NOT the same as the cover—never facing the viewer. The skyline is detailed with local landmarks. The hero’s lesson "${parsed.lesson}" is felt in posture and the peaceful golden light. The rival and best friend are absent, the hero is alone. The hero’s face, hair, and costume are exactly the same as the cover image. Cinematic, iconic, 80s comic art, no text.`,
        },
      ];

      setPanels(storyBeats);
      console.log('[ComicStoryPage] Panels set:', storyBeats);
    } catch (err) {
      setError('Invalid or corrupted data. Please restart.');
      console.error('[ComicStoryPage] Error parsing inputs:', err);
    }
  }, []);

  // 2. Auto-generate panels & dialogue as soon as storyBeats are set (after cover)
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

      // Get names
      const superheroName = inputs.superheroName || "Hero";
      const rivalName = getRivalName(inputs.fear);

      try {
        const generatedPanels: Panel[] = [{ ...panels[0], imageUrl: coverImageUrl }]; // Panel 0 is the cover

        for (let i = 1; i < panels.length; i++) {
          const panel = panels[i];

          // 1. Generate image (reuse your existing /api/generate-multi)
          const imgRes = await fetch('/api/generate-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: panel.prompt,
              inputImageUrl: coverImageUrl,
            }),
          });
          const imgJson = await imgRes.json();

          // 2. Generate dialogue (call your dialogue API, send both names and "best friend" instruction)
          let dialogue: DialogueLine[] = [];
          try {
            const dlgRes = await fetch('/api/generate-dialogue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                panelPrompt: panel.prompt,
                userInputs: {
                  ...inputs,
                  superheroName,
                  rivalName,
                  bestFriend: true,
                },
              }),
            });
            const dlgJson = await dlgRes.json();
            dialogue = dlgJson.dialogue || [];
          } catch (dlgErr) {
            dialogue = [{ speaker: superheroName, text: "..." }];
            console.error(`[ComicStoryPage] Error generating dialogue for panel ${i}:`, dlgErr);
          }

          generatedPanels.push({
            ...panel,
            imageUrl: imgJson.comicImageUrl,
            dialogue,
          });
          console.log(`[ComicStoryPage] Panel ${i} generated:`, {
            image: imgJson.comicImageUrl,
            dialogue,
          });
        }

        setPanels(generatedPanels);
        setHasGenerated(true);
        console.log('[ComicStoryPage] All panels generated!');
      } catch (err) {
        setError('Something went wrong while generating story panels.');
        console.error('[ComicStoryPage] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Only run when ready
    if (
      panels.length > 1 &&
      panels[0].imageUrl &&
      !panels[1]?.imageUrl &&
      !hasGenerated
    ) {
      autoGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, panels, hasGenerated]);

  // 3. Render panels
  // Get names for ComicPanel
  const superheroName = inputs?.superheroName || "Hero";
  const rivalName = inputs ? getRivalName(inputs.fear) : "Rival";

  return (
    <div className="p-4 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center">📖 Your Hero’s Origin Story</h1>
      {error && <p className="text-red-400 text-center">{error}</p>}
      <div className="grid md:grid-cols-2 gap-6">
        {panels.map((panel, idx) => (
          <div key={panel.id} className="rounded overflow-hidden shadow-lg bg-white text-black">
            {panel.imageUrl ? (
              <ComicPanel
                imageUrl={panel.imageUrl}
                dialogue={panel.dialogue}
                isCover={idx === 0}
                superheroName={superheroName}
                rivalName={rivalName}
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center bg-gray-200">
                <p className="text-gray-600">Waiting for panel {panel.id + 1}…</p>
              </div>
            )}
          </div>
        ))}
      </div>
      {loading && (
        <div className="text-center text-lg text-blue-300">Generating Story Panels…</div>
      )}
    </div>
  );
}
