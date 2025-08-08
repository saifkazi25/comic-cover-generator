import React from 'react';

interface Dialogue {
  text: string;
  speaker: string;
}
interface ComicPanelProps {
  imageUrl: string;
  dialogue?: Dialogue[];
  isCover?: boolean;
  superheroName?: string;   // This will be injected into text and as speaker
  rivalName?: string;       // If you want to color rival lines
  companionName?: string;   // ✅ NEW: to color/normalize companion lines
}

export default function ComicPanel({
  imageUrl,
  dialogue = [],
  isCover = false,
  superheroName = "Hero",    // default for safety
  rivalName = "Rival",
  companionName = "Alex"     // ✅ default companion label
}: ComicPanelProps) {
  // Helper: dynamic color for each speaker (case-insensitive)
  const getSpeakerColor = (speaker: string) => {
    const s = (speaker || '').trim().toLowerCase();
    if (s === superheroName.trim().toLowerCase()) return 'text-yellow-400';
    if (s === rivalName.trim().toLowerCase() || s === 'the dragons') return 'text-orange-400';
    if (s === companionName.trim().toLowerCase()) return 'text-sky-400'; // ✅ companion color
    if (s === 'mentor') return 'text-purple-300';
    return 'text-gray-200';
  };

  // 🔧 Normalize any generic/empty labels to real names (case-insensitive)
  const normalizeSpeaker = (raw: string | undefined) => {
    const s = String(raw ?? '').trim();
    const norm = s.toLowerCase();
    if (!s) return superheroName;

    if (
      norm === 'hero' ||
      norm === 'the hero' ||
      norm === 'protagonist' ||
      norm === 'main character' ||
      norm === 'narrator' ||
      norm === 'caption' ||
      norm === 'voiceover'
    ) return superheroName;

    if (
      norm === 'rival' ||
      norm === 'the rival' ||
      norm === 'villain' ||
      norm === 'enemy' ||
      norm === 'antagonist'
    ) return rivalName;

    // ✅ map companion-y labels to the concrete companionName
    if (
      norm === 'best friend' ||
      norm === 'bestfriend' ||
      norm === 'companion' ||
      norm === 'sidekick' ||
      norm.includes('best friend') // handles "Best Friend"
    ) return companionName;

    return s;
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
              // ✅ Normalize speaker names (handles "hero", "best friend", etc.)
              const displaySpeaker = normalizeSpeaker(bubble.speaker);

              // Replace {heroName} tokens in text if used
              const displayText = String(bubble.text ?? '…').replace(/{heroName}/g, superheroName);

              return (
                <div key={idx}>
                  <span
                    className={`font-bold mr-2 font-comic ${getSpeakerColor(displaySpeaker)}`}
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
