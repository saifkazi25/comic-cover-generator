'use client';

import React, { useEffect, useState } from 'react';

export default function ComicResultPage() {
  const [comicImageUrl, setComicImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get form answers and selfie from localStorage (or replace with your logic)
    const storedInputs = localStorage.getItem('comicInputs');
    const selfieUrl = localStorage.getItem('selfieUrl');
    if (!storedInputs || !selfieUrl) {
      setError('Missing comic inputs or selfie.');
      setLoading(false);
      return;
    }

    const inputData = JSON.parse(storedInputs);

    const fetchComic = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...inputData, selfieUrl }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to generate comic');
        }

        const data: { comicImageUrl: string } = await res.json();
        setComicImageUrl(data.comicImageUrl);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchComic();
    // eslint-disable-next-line
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Your Superhero Comic Cover</h1>

      {loading && (
        <div className="text-lg font-semibold">Generating your comic cover...</div>
      )}

      {error && (
        <div className="text-red-400 font-semibold my-4">{error}</div>
      )}

      {comicImageUrl && !loading && !error && (
        <div className="w-full max-w-2xl flex flex-col items-center">
          {/* For production, consider using next/image instead of <img> */}
          <img
            src={comicImageUrl}
            alt="Your Superhero Comic"
            className="rounded-xl border-4 border-yellow-500 shadow-xl max-w-full"
            style={{ background: '#222', objectFit: 'cover' }}
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
