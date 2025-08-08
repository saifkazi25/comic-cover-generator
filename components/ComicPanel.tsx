import React from 'react';

interface Dialogue {
  text: string;
  speaker: string;
}
interface ComicPanelProps {
  imageUrl: string;
  dialogue?: Dialogue[];
  isCover?: boolean;
  superheroName?: string;   // colored gold
  rivalName?: string;       // colored orange
  companionName?: string;   // 🔵 NEW: colored sky-blue
}

export default function ComicPanel({
  imageUrl,
  dialogue = [],
  isCover = false,
  superheroName = "Hero",
  rivalName = "Rival",
  companionName, // 🔵 NEW
}: ComicPanelProps) {
  const toKey = (v: string | undefined) => String(v ?? '').trim().toLowerCase();

  // Helper: dynamic color for each speaker (case-insensitive; robust to label variants)
  const getSpeakerColor = (speakerRaw: string) => {
    const s = toKey(speakerRaw);

    if (s === toKey(superheroName)) return 'text-yellow-400';
    if (s === toKey(rivalName) || s === 'the dragons') return 'text-orange-400';

    // 🔵 Companion: match by exact name OR common aliases coming from the dialogue API
    if (
      (companionName && s === toKey(companionName)) ||
      s.includes('best friend') ||
      s.includes('companion') ||
      s.includes('sidekick')
    ) {
      return 'text-sky-400';
    }

    return 'text-gray-200';
  };

  // Normalize any generic/empty labels to real names (so "companion" becomes the actual name)
  const normalizeSpeaker = (raw: string | undefined) => {
    const s = String(raw ?? '').trim();
    const norm = toKey(s);

    if (!s) return superheroName;

    if (
      norm === 'hero' ||
      norm === 'the hero' ||
      norm === 'protagonist' ||
      norm === 'main character' ||
      norm === 'narrator' ||
      norm === 'caption' ||
      norm === 'voiceover'
    ) {
      return superheroName;
    }

    if (
      norm === 'rival' ||
      norm === 'the rival' ||
      norm === 'villain' ||
      norm === 'enemy' ||
      norm === 'antagonist'
    ) {
      return rivalName;
    }

    // 🔵 Map companion-ish labels to the actual companionName, if we have it
    if (
      companionName &&
      (norm.includes('best friend') || norm.includes('companion') || norm.includes('sidekick'))
    ) {
      return companionName;
    }

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
              const displaySpeaker = normalizeSpeaker(bubble.speaker);
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
