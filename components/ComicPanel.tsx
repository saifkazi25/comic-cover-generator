import React from 'react';

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
}

export default function ComicPanel({
  imageUrl,
  dialogue = [],
  isCover = false,
}: ComicPanelProps) {
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
            {dialogue.map((bubble, idx) => (
              <div key={idx}>
                <span
                  className={`font-bold mr-2 font-comic ${
                    bubble.speaker === "Best Friend"
                      ? 'text-sky-400'
                      : bubble.speaker === "Rival"
                      ? 'text-red-400'
                      : 'text-yellow-400'
                  }`}
                  style={{ fontSize: "1rem" }}
                >
                  {bubble.speaker}:
                </span>
                <span
                  className="text-white font-comic"
                  style={{ fontSize: "0.98rem" }}
                >
                  {bubble.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
