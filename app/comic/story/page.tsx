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
  superheroName?: string;
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

      // Compose story panels (cover + 7 panels; total 8)
      const storyBeats: Panel[] = [
        { id: 0, imageUrl: coverImageUrl }, // Cover
        {
          id: 1,
          prompt: `A golden flashback. The young hero sits sideways on old playground equipment, in ordinary childhood clothes, clutching a memento that represents "${parsed.childhood}". Best Friend is nearby, offering silent support. The hero’s face & hair echo the cover but are shown in profile, gaze lost in memory. The background is a faded corner of ${parsed.city}—maybe cracked pavement and playground shadows. No superhero costume. Cinematic, 80s comic art, no text.`
        },
        {
          id: 2,
          prompt: `The hero’s face, hair, and costume are exactly the same as the cover image, he is wearing regular clothes. On a bright afternoon in ${parsed.city}, the hero stands in a lively city park. Families relax on picnic blankets. Children play in the distance. Suddenly, ${parsed.superpower} bursts to life for the first time. ${parsed.superpower} swirl through the grass, lifting kites and scattering flower petals. The hero is shown in a dramatic three-quarters pose, awe and surprise on their face. Nearby, Best Friend peeks out from behind a park bench, eyes wide. The rival watches from the shade of a tree, half-hidden.  No front-facing pose. 1980s comic art, no text.`
        },
        // ---- NEW: Training panel ----
        {
          id: 3,
          prompt: `The hero’s face, hair, and costume are exactly the same as the cover image.Training montage: In a gym, rooftop, or remote field, the hero struggles to control and refine ${parsed.superpower}. Sweat, wind, and intense focus. Training clothes, not the superhero suit. Best Friend offers encouragement, maybe holding a stopwatch or notepad. The background shows dramatic clouds or swirling elements reacting to the hero's effort. Cinematic 80s comic art, no text.`
        },
        // ---- NEW: Mastery panel ----
        {
          id: 4,
          prompt: `The hero’s face, hair, and costume are exactly the same as the cover image. First time in the suit: The hero, confident and powerful, now fully masters ${parsed.superpower}. Wearing the superhero suit for the first time, standing atop a rooftop or iconic city spot at dusk. Their power is under control, glowing or swirling around them with intent. Best Friend and rival may be visible in the distance, awed.  80s comic art, no text.`
        },
        {
          id: 5,
          prompt: `The hero’s face, hair, and costume are exactly the same as the cover image. In a rain-soaked alley, the hero stands face-to-face with the rival—who now embodies the monstrous form of "${parsed.fear}". Both are shown in profile or dramatic three-quarters view, inches apart, tension crackling. The hero’s costume, face, and hair match the cover, but fear is written in every feature—trembling hands, sweat, clenched jaw. The alley is lined with glowing signs, puddles reflecting twisted shapes. Best Friend is distant, blurred. No backs to camera. Pure confrontation, psychological drama, 80s comic art, no text.`
        },
        {
          id: 6,
          prompt: `The hero’s face, hair, and costume are exactly the same as the cover image. In the middle of a bustling street or open plaza in ${parsed.city}, surrounded by amazed pedestrians, the hero unleashes the full force of ${parsed.strength} to finally overcome the rival, who embodies the monstrous form of "${parsed.fear}". In a dynamic side pose—not facing forward—the hero sends the rival tumbling into swirling shadows, broken symbols of "${parsed.fear}" scattering across the pavement. Best Friend cheers from the crowd, arms raised in triumph. Local city details—street signs, colorful market stalls, vibrant banners—fill the background. Dramatic, hopeful, energetic 80s comic art, no text.`
        },
        {
          id: 7,
          prompt: `The hero’s face, hair, and costume are exactly the same as the cover image. At dawn, the hero stands or sits sideways atop a building ledge in ${parsed.city}, cape fluttering, hands resting on knees or arms folded, gazing out over the waking city. The pose is calm, reflective, NOT the same as the cover—never facing the viewer. The skyline is detailed with local landmarks. The hero’s lesson "${parsed.lesson}" is felt in posture and the peaceful golden light. The rival and Best Friend are absent, the hero is alone.  Cinematic, iconic, 80s comic art, no text.`
        }
      ];

      setPanels(storyBeats);
      console.log('[ComicStoryPage] Panels set:', storyBeats);
    } catch (err) {
      setError('Invalid or corrupted data. Please restart.');
      console.error('[ComicStoryPage] Error parsing inputs:', err);
    }
  }, []);

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

      const superheroName = inputs.superheroName || "Hero";
      const rivalName = getRivalName(inputs.fear);

      try {
        const generatedPanels: Panel[] = [{ ...panels[0], imageUrl: coverImageUrl }];

        for (let i = 1; i < panels.length; i++) {
          const panel = panels[i];

          // 1. Generate image
          const imgRes = await fetch('/api/generate-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: panel.prompt,
              inputImageUrl: coverImageUrl,
            }),
          });
          const imgJson = await imgRes.json();

          // 2. Generate dialogue
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
            dialogue = (dlgJson.dialogue || []).map((d: any) => ({
              ...d,
              speaker:
                d.speaker === "Hero"
                  ? superheroName
                  : d.speaker === "Companion"
                  ? "Best Friend"
                  : d.speaker === "Rival"
                  ? rivalName
                  : d.speaker,
            }));
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

  const superheroName = inputs?.superheroName || "Hero";
  const rivalName = inputs ? getRivalName(inputs.fear) : "Rival";

  return (
    <div className="p-4 space-y-8 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold text-center">📖 Your Hero’s Origin Story</h1>
      {error && <p className="text-red-400 text-center">{error}</p>}
      
      {/* VERTICAL PANEL LIST BELOW */}
      <div className="flex flex-col gap-6 items-center">
        {panels.map((panel, idx) => (
          <div
            key={panel.id}
            className="w-full max-w-lg rounded overflow-hidden shadow-lg bg-white text-black"
          >
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
