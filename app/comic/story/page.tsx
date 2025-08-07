'use client';

import { useEffect, useState } from 'react';
import ComicPanel from '../../../components/ComicPanel'; // Adjust path as needed

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
  prompt?: string;
  imageUrl?: string;
  dialogue?: { text: string }[]; // The dialogue for the panel
}

export default function ComicStoryPage() {
  const [inputs, setInputs] = useState<ComicRequest | null>(null);
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Step 1: Setup story beats and inputs
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

      const storyBeats: Panel[] = [
        // Panel 1: Cover (display only, no overlay)
        {
          id: 0,
          imageUrl: coverImageUrl,
          dialogue: [],
        },
        // Panel 2: Origin
        {
          id: 1,
          prompt: `A golden flashback. The young hero sits sideways on old playground equipment, in ordinary childhood clothes, clutching a memento that represents "${parsed.childhood}". Their loyal best friend is nearby, offering silent support. The hero’s face & hair echo the cover but are shown in profile, gaze lost in memory. The background is a faded corner of ${parsed.city}—maybe cracked pavement and playground shadows. No superhero costume. Cinematic, 80s comic art, no text.`,
        },
        // Panel 3: Catalyst
        {
          id: 2,
          prompt: `On a bright afternoon in ${parsed.city}, the hero stands in a lively city park. Families relax on picnic blankets. Children play in the distance. Suddenly, ${parsed.superpower} bursts to life for the first time. ${parsed.superpower} swirl through the grass, lifting kites and scattering flower petals. The hero is shown in a dramatic three-quarters pose, awe and surprise on their face. Their loyal best friend peeks out from behind a park bench, eyes wide. The rival watches from the shade of a tree, half-hidden. The hero’s face, hair, and costume are exactly the same as the cover image. No front-facing pose. 1980s comic art, no text.`,
        },
        // Panel 4: Conflict
        {
          id: 3,
          prompt: `In a rain-soaked alley, the hero stands face-to-face with the rival—who now embodies the monstrous form of "${parsed.fear}". Both are shown in profile or dramatic three-quarters view, inches apart, tension crackling. The hero’s costume, face, and hair match the cover, but fear is written in every feature—trembling hands, sweat, clenched jaw. The alley is lined with glowing signs, puddles reflecting twisted shapes. Their loyal best friend is distant, blurred. The hero’s face, hair, and costume are exactly the same as the cover image. No backs to camera. Pure confrontation, psychological drama, 80s comic art, no text.`,
        },
        // Panel 5: Climax
        {
          id: 4,
          prompt: `In the middle of a bustling street or open plaza in ${parsed.city}, surrounded by amazed pedestrians, the hero unleashes the full force of ${parsed.strength} to finally overcome the rival, who embodies the monstrous form of "${parsed.fear}". In a dynamic side pose—not facing forward—the hero sends the rival tumbling into swirling shadows, broken symbols of "${parsed.fear}" scattering across the pavement. Their loyal best friend cheers from the crowd, arms raised in triumph. Local city details—street signs, colorful market stalls, vibrant banners—fill the background. The hero’s face, hair, and costume are exactly the same as the cover image. Dramatic, hopeful, energetic 80s comic art, no text.`,
        },
        // Panel 6: Resolution
        {
          id: 5,
          prompt: `At dawn, the hero stands or sits sideways atop a building ledge in ${parsed.city}, cape fluttering, hands resting on knees or arms folded, gazing out over the waking city. The pose is calm, reflective, NOT the same as the cover—never facing the viewer. The skyline is detailed with local landmarks. The hero’s lesson "${parsed.lesson}" is felt in posture and the peaceful golden light. The rival and companion are absent, the hero is alone. The hero’s face, hair, and costume are exactly the same as the cover image. Cinematic, iconic, 80s comic art, no text.`,
        },
      ];

      setPanels(storyBeats);
      console.log('[ComicStoryPage] Panels set:', storyBeats);
    } catch (e) {
      setError('Invalid or corrupted data. Please restart.');
      console.error('[ComicStoryPage] Error parsing inputs:', e);
    }
  }, []);

  // Step 2: Auto-generate images and dialogue
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
        const generatedPanels: Panel[] = [{ ...panels[0] }]; // Cover panel, no dialogue

        for (let i = 1; i < panels.length; i++) {
          const panel = panels[i];
          // 1. Generate image as before
          const imgRes = await fetch('/api/generate-multi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: panel.prompt,
              inputImageUrl: coverImageUrl,
            }),
          });
          const imgJson = await imgRes.json();

          // 2. Generate dialogue with OpenAI (call your dialogue endpoint)
          let dialogue: { text: string }[] = [];
          try {
            const dialogueRes = await fetch('/api/generate-dialogue', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                panelPrompt: panel.prompt,
                userInputs: inputs,
              }),
            });
            const dialogueJson = await dialogueRes.json();
            dialogue = Array.isArray(dialogueJson.dialogue)
              ? dialogueJson.dialogue
              : [];
            console.log(`[ComicStoryPage] AI Dialogue for panel ${panel.id}:`, dialogue);
          } catch (dErr) {
            console.warn(`[ComicStoryPage] Dialogue API failed for panel ${panel.id}:`, dErr);
            dialogue = [];
          }

          generatedPanels.push({
            ...panel,
            imageUrl: imgJson.comicImageUrl,
            dialogue,
          });
          console.log(`[ComicStoryPage] Generated panel ${panel.id}:`, { ...panel, imageUrl: imgJson.comicImageUrl, dialogue });
        }

        setPanels(generatedPanels);
        setHasGenerated(true);
      } catch (err) {
        setError('Something went wrong while generating story panels.');
        console.error('[ComicStoryPage] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    // Only trigger auto-generate if not already run
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
        {panels.map((panel, idx) => (
          <div key={panel.id} className="rounded overflow-hidden shadow-lg bg-white text-black">
            {panel.imageUrl ? (
              <ComicPanel
                imageUrl={panel.imageUrl}
                dialogue={panel.dialogue || []}
                isCover={idx === 0}
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
        <div className="text-center t
