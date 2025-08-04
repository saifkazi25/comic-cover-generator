'use client';

import React, { useEffect, useState } from 'react';

export default function ComicResultPage() {
  const [comicImageUrl, setComicImageUrl] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);

  useEffect(() => {
    const storedInputs = localStorage.getItem('comicInputs');
    const selfieUrl    = localStorage.getItem('selfieUrl');

    if (!storedInputs || !selfieUrl) {
      setError('Missing inputs or selfie.');
      setLoading(false);
      return;
    }

    const inputData = JSON.parse(storedInputs);

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/generate', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ...inputData, selfieUrl }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to generate');
        }
        const data = (await res.json()) as { comicImageUrl: string };
        setComicImageUrl(data.comicImageUrl);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Your Superhero Comic Cover</h1>

      {loading && <div className="text-lg">Generating…</div>}
      {error && <div className="text-red-400">{error}</div>}

      {!loading && !error && comicImageUrl && (
        <div className="flex flex-col items-center max-w-2xl w-full">
          <img
            src={comicImageUrl}
            alt="Comic"
            className="rounded-xl border-4 border-yellow-500 shadow-xl"
            style={{ objectFit: 'cover' }}
          />
          <a
            href={comicImageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 underline text-blue-300 hover:text-blue-500"
          >
            View Full Size
          </a>
        </div>
      )}
    </div>
  );
}
