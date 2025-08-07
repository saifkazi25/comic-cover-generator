// components/ComicPanel.tsx
import React from "react";

// If you have a Google Font, import it in _app.tsx or your global CSS for best results
// This uses fallback Comic Sans/Bangers as a comic feel
export default function ComicPanel({
  imageUrl,
  dialogue = [],
  isCover = false,
  superheroName = "Hero",
  rivalName = "Rival",
}: {
  imageUrl: string;
  dialogue?: { text: string; speaker: string }[];
  isCover?: boolean;
  superheroName?: string;
  rivalName?: string;
}) {
  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-md">
      <img
        src={imageUrl}
        alt="Comic Panel"
        className="w-full h-auto object-cover rounded"
        style={{ maxHeight: 700 }}
      />
      {/* Show dialogue bar if not cover and there is dialogue */}
      {!isCover && dialogue && dialogue.length > 0 && (
        <div
          className="absolute bottom-0 left-0 w-full py-4 px-6 flex flex-col gap-2"
          style={{
            background: "rgba(0,0,0,0.56)",
            fontFamily: `'Bangers', 'Comic Sans MS', cursive, sans-serif`,
            color: "#fff",
            fontWeight: 700,
            fontSize: "1.3rem",
            letterSpacing: "0.01em",
            borderBottomLeftRadius: "1.1rem",
            borderBottomRightRadius: "1.1rem",
            textShadow: "1.5px 1.5px 6px #111",
            lineHeight: 1.23,
            minHeight: "4.2rem",
          }}
        >
          {dialogue.map((d, idx) => {
            let name = d.speaker;
            if (/hero/i.test(name)) name = superheroName || "Hero";
            if (/rival/i.test(name)) name = rivalName || "Rival";
            if (/friend|companion/i.test(name)) name = "Best Friend";
            let color =
              name === superheroName
                ? "#FFD600"
                : name === "Best Friend"
                ? "#40e0ff"
                : "#FF6666";
            return (
              <div key={idx}>
                <span style={{ color }}>{name}:</span>{" "}
                <span style={{ color: "#fff", fontWeight: 400 }}>{d.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
