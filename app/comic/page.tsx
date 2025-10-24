'use client';

import { Suspense } from 'react';
import SlidingQuiz from '../../components/SlidingQuiz';

// prevent static prerender so CSR hooks don't trip the build
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ComicPage() {
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
