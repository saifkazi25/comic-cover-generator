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

      const costumeDesc = `the exact superhero costume from the cover: wind-themed, modern, bold colors, no Superman logo, no S-shield, no capes or emblems resembling Superman, original design only`;
      const pronoun = parsed.gender.toLowerCase() === 'male' ? 'his' : parsed.gender.toLowerCase() === 'female' ? 'her' : 'their';
      const pronounUpper = pronoun.charAt(0).toUpperCase() + pronoun.slice(1);
      const cityDetails = `Iconic landmarks, city lights, and the unique feel of ${parsed.city} infuse the background.`;

      // Keep companion and rival but make the companion fade by panel 6
      const companion = "their loyal best friend, full of spirit";
      const rival = "a mysterious rival, always lurking at the edge of the story";

      const storyBeats: Panel[] = [
        // Panel 1: The cover (display only)
        {
          id: 0,
          caption: `Issue 01 — ${parsed.lesson}`,
          imageUrl: coverImageUrl,
        },
        // Panel 2: Origin — Childhood
        {
          id: 1,
          caption: `Origin: Shaped by ${parsed.childhood}`,
          prompt: `
Golden-hour in ${parsed.city}, the young hero sits alone on worn steps, lost in thought, dressed in everyday clothes—no costume yet. Their loyal friend, ${companion}, stands a short distance away, watching with quiet concern. Around them, hints of hardship from ${parsed.childhood}—faded schoolbooks, a frayed backpack, scraped shoes—add emotional weight. The hero's face and hair are a perfect match to the cover, shown in side profile or from behind, gazing into the distance. The background pulses with the energy and landmarks of ${parsed.city}. No superhero costume or symbols. Deep nostalgia, warm 1980s comic art, no text, no Superman logo, no S-shield.
          `.trim(),
        },
        // Panel 3: Catalyst — First Power
        {
          id: 2,
          caption: `Catalyst: The spark of ${parsed.superpower}`,
          prompt: `
A stormy, dynamic scene on a windswept rooftop in ${parsed.city}. The hero, half-turned away, is caught in a swirl of ${parsed.superpower}, hair and clothes whipping, face alight with shock and awe. Loose papers and debris rise in the air. ${companion} is startled, bracing against the wind, while ${rival} is a vague silhouette on a distant rooftop, observing silently. The first flickers of costume appear—just a glowing hint, no Superman logos, no S-shield, nothing derivative. The city glimmers with neon and storm clouds. Cinematic angle, energy crackles. 1980s comic style, no text, no Superman logo, no S-shield.
          `.trim(),
        },
        // Panel 4: Conflict — Facing Fear
        {
          id: 3,
          caption: `Conflict: Faces the fear of ${parsed.fear}`,
          prompt: `
Midnight in a neon alley, rain pouring. The hero, fully in ${costumeDesc}, stands alone in a pool of reflected city light, facing away from the viewer or in a tense profile. The fear of ${parsed.fear} is etched in posture—tense shoulders, clenched fists. ${rival} steps from the darkness, challenging the hero. The companion is now in the distant background, barely visible, symbolizing isolation in this critical moment. Puddles reflect rain and city signs. All costume details are original—no Superman logo, no S-shield, no capes like Superman. Raw emotion, cinematic lighting, 80s comic art, no text.
          `.trim(),
        },
        // Panel 5: Climax — Triumph with Strength
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
Sun breaks through storm clouds over ${parsed.city} square. The hero, seen in heroic three-quarters view from above, channels the full force of ${parsed.strength}—a tornado of wind and energy repels the rival, who tumbles backward in defeat. The crowd—including the companion, awestruck—gathers at the edge. The hero’s costume, pose, and energy are at their peak, matching the cover, no Superman logos or S-shield, all original. Dynamic action, leaves and debris swirling, city skyline blazing behind. 1980s comic grandeur, no text, no Superman logo, no S-shield.
          `.trim(),
        },
        // Panel 6: Resolution — Alone, Reflective, Epic
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
Dawn atop a tall building in ${parsed.city}. The hero stands utterly alone at the edge, looking out across the glowing city. The costume is identical to the cover, but absolutely no Superman logo, no S-shield, no Superman cape, all unique and original. The rival and companion are gone—the hero is solitary, changed, silhouetted against the sunrise. Head bowed in reflection or facing away from the viewer, their journey and the lesson "${parsed.lesson}" written in posture and mood, not words. Quiet, powerful, iconic. Soft golden light, epic 1980s comic book style, no text, no Superman logo, no S-shield.
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
