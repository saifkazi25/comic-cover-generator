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
}

export default function ComicPanel({
  imageUrl,
  dialogue = [],
  isCover = false,
  superheroName = "Hero",    // default for safety
  rivalName = "Rival"
}: ComicPanelProps) {
  // Helper: dynamic color for each speaker (add as many as you want)
  const getSpeakerColor = (speaker: string) => {
    if (speaker === superheroName) return 'text-yellow-400';
    if (speaker === rivalName || speaker === "The Dragons") return 'text-orange-400';
    if (speaker === "Best Friend") return 'text-sky-400';
    if (speaker === "Mentor") return 'text-purple-300';
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
              // Replace "Hero" with superheroName everywhere (as speaker)
              const displaySpeaker =
                bubble.speaker === "Hero" ? superheroName : bubble.speaker;

              // Replace {heroName} in text (optional, if you use that pattern)
              const displayText =
                bubble.text.replace(/{heroName}/g, superheroName);

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
