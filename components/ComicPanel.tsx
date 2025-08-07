// components/ComicPanel.tsx
import React from 'react';

export interface ComicPanelProps {
  imageUrl: string;
  dialogue?: { text: string; speaker?: string }[];
  isCover?: boolean;
}

export default function ComicPanel({ imageUrl, dialogue = [], isCover }: ComicPanelProps) {
  return (
    <div className="relative w-full h-full min-h-[500px] flex flex-col justify-end items-stretch overflow-hidden rounded-xl shadow-xl">
      <img
        src={imageUrl}
        alt="Comic panel"
        className="object-cover w-full h-[600px] rounded-xl"
        style={{ minHeight: 400 }}
      />
      {/* Dialogue at the bottom */}
      {!isCover && dialogue && dialogue.length > 0 && (
        <div
          className="absolute bottom-0 left-0 w-full py-6 px-4"
          style={{
            background: 'rgba(0,0,0,0.60)', // semi-transparent black
            fontFamily: `'Bangers', 'Comic Sans MS', cursive, sans-serif`,
            color: 'white',
            textShadow: '2px 2px 4px #222',
            fontWeight: 'bold',
            fontSize: '2rem',
            letterSpacing: '0.04em',
            borderBottomLeftRadius: '1.25rem',
            borderBottomRightRadius: '1.25rem',
          }}
        >
          {dialogue.map((d, idx) => (
            <div key={idx} className="mb-2">
              {d.speaker ? (
                <span style={{ color: '#FFD700', fontWeight: 900, marginRight: 12 }}>
                  {d.speaker[0].toUpperCase() + d.speaker.slice(1)}:
                </span>
              ) : null}
              {d.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
