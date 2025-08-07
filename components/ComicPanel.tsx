import React from "react";

interface DialogueLine {
  text: string;
}

interface ComicPanelProps {
  imageUrl: string;
  dialogue?: DialogueLine[]; // lines of text for the overlay
  isCover?: boolean; // true for cover panel
}

export default function ComicPanel({ imageUrl, dialogue = [], isCover }: ComicPanelProps) {
  // Panel 1 (cover): no overlay
  if (isCover) {
    return (
      <div className="relative rounded overflow-hidden shadow-lg bg-white text-black">
        <img
          src={imageUrl}
          alt="Comic Cover"
          width={800}
          height={1000}
          className="w-full h-auto object-cover rounded"
          style={{ background: "#f3f3f3" }}
        />
      </div>
    );
  }

  // Other panels: bottom overlay, no caption
  return (
    <div className="relative rounded overflow-hidden shadow-lg bg-white text-black">
      <img
        src={imageUrl}
        alt="Comic Panel"
        width={800}
        height={1000}
        className="w-full h-auto object-cover rounded"
        style={{ background: "#f3f3f3" }}
      />
      <div className="absolute left-0 right-0 bottom-0 flex justify-center">
        <div className="bg-black bg-opacity-80 text-white px-6 py-4 rounded-t-xl w-full text-center text-xl font-semibold whitespace-pre-line">
          {dialogue.length > 0
            ? dialogue.map((line, idx) => (
                <div key={idx}>{line.text}</div>
              ))
            : <span>&nbsp;</span>
          }
        </div>
      </div>
    </div>
  );
}
