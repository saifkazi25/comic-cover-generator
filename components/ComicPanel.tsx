import React, { useMemo } from 'react';

interface Dialogue {
  text: string;
  speaker: string;
}
interface ComicPanelProps {
  imageUrl: string;
  dialogue?: Dialogue[];
  isCover?: boolean;
  superheroName?: string;
  rivalName?: string;
  companionName?: string; // optional: we’ll also try localStorage
}

export default function ComicPanel({
  imageUrl,
  dialogue = [],
  isCover = false,
  superheroName = "Hero",
  rivalName = "Rival",
  companionName, // may be omitted by caller
}: ComicPanelProps) {
  const toKey = (v: string | undefined) => String(v ?? '').trim().toLowerCase();

  // ✅ Resolve companion name even if not passed as a prop
  const resolvedCompanionName = useMemo(() => {
    const fromProp = (companionName ?? '').trim();
    if (fromProp) return fromProp;
    if (typeof window !== 'undefined') {
      const fromLS = (localStorage.getItem('companionName') ?? '').trim();
      if (fromLS) return fromLS;
    }
    return 'Companion'; // last-resort label
  }, [companionName]);

  const heroKey = toKey(superheroName);
  const rivalKey = toKey(rivalName);
  const compKey  = toKey(resolvedCompanionName);

  // Normalize generic labels to real names (maps “companion/best friend/sidekick” ➜ actual companion name)
  const normalizeSpeaker = (raw: string | undefined) => {
    const s = String(raw ?? '').trim();
    const k = toKey(s);

    if (!s) return superheroName;

    if (
      k === 'hero' || k === 'the hero' ||
      k === 'protagonist' || k === 'main character' ||
      k === 'narrator' || k === 'caption' || k === 'voiceover'
    ) return superheroName;

    if (
      k === 'rival' || k === 'the rival' ||
      k === 'villain' || k === 'enemy' || k === 'antagonist'
    ) return rivalName;

    if (['best friend','bestfriend','companion','sidekick'].some(t => k.includes(t))) {
      return resolvedCompanionName;
    }

    return s; // already a proper name like “Taylor”
  };

  // Color only the speaker label
  const getSpeakerColorClass = (speakerRaw: string) => {
    const k = toKey(speakerRaw);
    if (k === heroKey) return 'text-yellow-400';   // hero = gold
    if (k === rivalKey) return 'text-orange-400';  // rival = orange
    if (k === compKey)  return 'text-sky-400';     // companion = sky blue
    return 'text-gray-200';
  };

  return (
    <div className="relative w-full h-full">
      <img
        src={imageUrl}
        alt="Comic Panel"
        className="w-full h-auto rounded"
        style={{ objectFit: 'cover' }}
      />
      {!isCover && dialogue.length > 0 && (
        <div
          className="absolute left-0 right-0 bottom-0 px-4 py-3"
          style={{
            background: 'rgba(0,0,0,0.55)',
            borderBottomLeftRadius: '1rem',
            borderBottomRightRadius: '1rem',
          }}
        >
          <div className="space-y-1">
            {dialogue.map((bubble, idx) => {
              const displaySpeaker = normalizeSpeaker(bubble.speaker);
              const displayText = String(bubble.text ?? '…').replace(/{heroName}/g, superheroName);

              return (
                <div key={idx}>
                  <span
                    className={`font-bold mr-2 font-comic ${getSpeakerColorClass(displaySpeaker)}`}
                    style={{ fontSize: "1rem" }}
                  >
                    {displaySpeaker}:
                  </span>
                  <span
                    className="text-white font-comic"
                    style={{ fontSize: "0.98rem" }}
                  >
                    {displayText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
