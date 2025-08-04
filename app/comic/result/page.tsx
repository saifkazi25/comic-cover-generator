// app/comic/result/page.tsx
'use client';

import React, { useEffect, useState } from 'react';

export default function ComicResultPage() {
  const [comicUrl, setComicUrl] = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('comicInputs');
    const selfie = localStorage.getItem('selfieUrl');
    if (!raw || !selfie) {
      setError('Missing inputs or selfie.');
      setLoading(false);
      return;
    }

    const inputs = JSON.parse(raw);
    fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...inputs, selfieUrl: selfie }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.comicImageUrl) setComicUrl(data.comicImageUrl);
        else setError(data.error || 'Generation failed');
      })
      .catch((e) => setError(e.message || 'Unknown error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="p-8">Generating your comic…</p>;
  if (error)   return <p className="p-8 text-red-500">{error}</p>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-8">
      <h1 className="text-3xl text-white mb-4">Your Superhero Comic Cover</h1>
      <img
        src={comicUrl!}
        alt="Comic Cover"
        className="rounded-xl border-4 border-yellow-500 shadow-xl max-w-full"
      />
      <a
        href={comicUrl!}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-yellow-300 hover:underline"
      >
        View Full Size
      </a>
    </div>
  );
}
