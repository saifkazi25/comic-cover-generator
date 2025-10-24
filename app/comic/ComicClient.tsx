// app/comic/ComicClient.tsx
'use client';

import { Suspense } from 'react';
import SlidingQuiz from '../../components/SlidingQuiz';

export default function ComicClient() {
  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-start justify-start p-10"
      style={{ backgroundImage: "url('/quiz-bg-mobile.jpg')" }}
    >
      <Suspense fallback={<div className="text-white/80">Loading…</div>}>
        <SlidingQuiz />
      </Suspense>
    </div>
  );
}
