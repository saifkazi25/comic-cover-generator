// components/ComicPanel.tsx
import React from "react";

interface Bubble {
  id: number;
  text: string;
  speaker?: "hero" | "companion" | "rival" | string;
}
interface ComicPanelProps {
  imageUrl: string;
  // caption?: string; // REMOVE, not needed anymore
  bubbles?: Bubble[];
}

export default function ComicPanel({
  imageUrl,
  bubbles = [],
}: ComicPanelProps) {
  return (
    <div className="relative w-full h-[600px] flex flex-col justify-end overflow-hidden rounded-2xl shadow-lg border-2 border-black">
      <img
        src={imageUrl}
        alt="Comic panel"
        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
        draggable={false}
      />

      {/* BOTTOM BUBBLE STRIP */}
      {bubbles && bubbles.length > 0 && (
        <div
          className="relative z-10 w-full px-4 py-3"
          style={{
            background:
              "linear-gradient(0deg,rgba(0,0,0,0.75) 80%,rgba(0,0,0,0.15) 100%,rgba(0,0,0,0.0) 100%)",
            fontFamily: "'Bangers', 'Comic Sans MS', cursive, sans-serif",
          }}
        >
          {bubbles.map((b, idx) => (
            <div key={b.id || idx} className="mb-1 text-2xl flex flex-row items-center">
              <span
                className="font-bold mr-2"
                style={{
                  color:
                    b.speaker === "hero"
                      ? "#39d353"
                      : b.speaker === "rival"
                      ? "#fa5252"
                      : b.speaker === "companion"
                      ? "#fbbc04"
                      : "#fff",
                  textShadow: "2px 2px 0 #000",
                  fontFamily: "inherit",
                }}
              >
                {b.speaker
                  ? b.speaker.charAt(0).toUpperCase() +
                    b.speaker.slice(1) +
                    ":"
                  : ""}
              </span>
              <span
                style={{
                  color: "#fff",
                  textShadow: "2px 2px 0 #000",
                  fontFamily: "inherit",
                }}
              >
                {b.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
