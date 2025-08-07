'use client';

import { useState, useEffect } from 'react';

interface Bubble {
  id: number;
  text: string;
  x: string;
  y: string;
}

interface ComicPanelProps {
  imageUrl: string;
  caption: string;
  initialBubbles?: Bubble[];
}

export default function ComicPanel({
  imageUrl,
  caption,
  initialBubbles = [
    { id: 1, text: 'I must be strong!', x: '18%', y: '12%' },
    { id: 2, text: 'You can do it!', x: '68%', y: '72%' }
  ]
}: ComicPanelProps) {
  const [bubbles, setBubbles] = useState<Bubble[]>(initialBubbles);

  // LOG: When component mounts
  useEffect(() => {
    console.log('[ComicPanel] Mounted with:', { imageUrl, caption, initialBubbles });
  }, []);

  // LOG: When bubbles change
  useEffect(() => {
    console.log('[ComicPanel] Bubbles updated:', bubbles);
  }, [bubbles]);

  const updateBubble = (id: number, newText: string) => {
    setBubbles(bubbles.map(b => b.id === id ? { ...b, text: newText } : b));
    // LOG: Editing a bubble
    console.log(`[ComicPanel] Bubble ${id} edited:`, newText);
  };

  return (
    <div className="relative w-[400px] h-[500px] mx-auto mb-8">
      <img src={imageUrl} alt={caption} className="w-full h-full object-cover rounded-lg" />
      {bubbles.map(bubble => (
        <div
          key={bubble.id}
          className="absolute min-w-[120px] max-w-[60%] px-4 py-2 bg-white text-black rounded-full border-2 border-black shadow"
          style={{
            left: bubble.x,
            top: bubble.y,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <input
            type="text"
            value={bubble.text}
            onChange={e => updateBubble(bubble.id, e.target.value)}
            className="bg-transparent border-none outline-none w-full font-comic"
          />
        </div>
      ))}
      <div className="absolute bottom-0 left-0 w-full text-center text-white bg-black/60 py-1 rounded-b-lg text-lg font-bold">{caption}</div>
    </div>
  );
}
