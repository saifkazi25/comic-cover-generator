'use client';
import SlidingQuiz from '../../components/SlidingQuiz';

export default function ComicPage() {
  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-start justify-start p-10"
      style={{ backgroundImage: "url('/quiz-bg-mobile.jpg')" }} // ✅ no /public, added extension
    >
      <SlidingQuiz />
    </div>
  );
}
