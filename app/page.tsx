'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-black via-slate-900 to-indigo-900 text-white">
      <h1 className="text-4xl font-extrabold mb-8">🦸‍♂️ Comic Cover Generator</h1>
      <p className="text-xl mb-10 text-center max-w-xl">
        Create your own superhero comic cover, powered by AI. Ready to become legendary?
      </p>
      <Link href="/comic">
        <button className="bg-yellow-400 hover:bg-yellow-500 text-black text-xl font-bold px-8 py-4 rounded-xl shadow-lg transition">
          Start My Comic
        </button>
      </Link>
    </div>
  );
}
