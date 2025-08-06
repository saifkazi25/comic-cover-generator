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

      // Cinematic detail helpers
      const costumeDesc = `the exact superhero costume from the cover: wind-themed suit, bold cape, and shining chest emblem`;
      const pronoun = parsed.gender.toLowerCase() === 'male' ? 'his' : parsed.gender.toLowerCase() === 'female' ? 'her' : 'their';
      const pronounUpper = pronoun.charAt(0).toUpperCase() + pronoun.slice(1);

      // Dynamic characters (user can upgrade these later)
      const companion = "their loyal best friend, full of spirit";
      const rival = "a mysterious rival, hidden in the city's shadows";
      const cityDetails = `Landmarks, skyline, and the spirit of ${parsed.city} are woven into every background.`;

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
Golden-hour scene in busy ${parsed.city}. The hero as a young child, sitting on a swingset or stoop, dressed in faded jeans and a hoodie, looking off to the side, deep in thought. ${companion} is at their side, sharing a snack or lost in conversation. Faded posters, cracked pavement, or a weathered backpack hint at ${parsed.childhood}. Faces shown in gentle profile or from behind, blending into the city buzz. Glowing sunlight filters through the scene. ${cityDetails} No costume—just an ordinary kid. Deeply nostalgic, detailed, 1980s comic art, no text.
          `.trim(),
        },
        // Panel 3: Catalyst — First Power, Highly Concrete & Visual
        {
          id: 2,
          caption: `Catalyst: The spark of ${parsed.superpower}`,
          prompt: `
A storm is breaking over the rooftops of ${parsed.city}. The hero, caught in the moment, stands in profile, wind whipping hair and clothes, eyes wide with realization. Around the hero, objects (papers, leaves, cans) spiral upward—${parsed.superpower} unleashed. ${companion} shields their face from the wind, stunned. Far in the background, ${rival} peers out from a fire escape, expression unreadable. Lightning forks across the sky. The first hint of the superhero costume appears, maybe just a glowing emblem or cape fluttering. Dramatic camera angle—shot from below, energy crackling. Vivid, dynamic, cinematic 80s comic, no text.
          `.trim(),
        },
        // Panel 4: Conflict — Facing Fear
        {
          id: 3,
          caption: `Conflict: Faces the fear of ${parsed.fear}`,
          prompt: `
Neon-lit alley at midnight, rain pouring down. The hero, in full costume, stands hunched and uncertain, shown from behind or in shadow, wrestling with the fear of ${parsed.fear}. ${rival} steps boldly from the darkness, taunting or blocking the hero’s way, while ${companion} looks on anxiously from a doorway, ready to intervene. Puddles reflect the glow of city signs. The hero’s hand clenches a token of ${parsed.fuel} for courage. Scene is tense, emotional, full of dramatic lighting and rain effects. 1980s comic art, no text.
          `.trim(),
        },
        // Panel 5: Climax — Triumph with Strength
        {
          id: 4,
          caption: `Climax: Triumph with ${parsed.strength}`,
          prompt: `
The city’s main square, afternoon. The hero is mid-leap, captured in a dynamic side view as they blast back the rival with pure force of ${parsed.strength}. ${companion} cheers with the crowd, papers and hats swirling in the wind. The hero’s costume and face match the cover, but the pose is heroic and new, cape billowing, emblem shining. The rival is overwhelmed, cloak torn, tumbling away. ${cityDetails} Sunlight pours through parted clouds, people point and cheer. Action-packed, bold, cinematic, 1980s comic book style, no text.
          `.trim(),
        },
        // Panel 6: Resolution — Lesson Learned
        {
          id: 5,
          caption: `Resolution: Lesson – ${parsed.lesson}`,
          prompt: `
Early morning on a tall rooftop, soft mist rising over ${parsed.city}. The hero and ${companion}, seen from behind, share a quiet moment watching the sunrise, city below awakening. The hero’s hand rests reassuringly on their friend’s shoulder. The costume matches the cover, but their posture is calm, relaxed, and reflective. The rival is now just a fading memory, their shadow gone. The lesson "${parsed.lesson}" is shown in the gentle strength of the hero’s pose. Subtle, cinematic, golden 80s comic art, no text.
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
