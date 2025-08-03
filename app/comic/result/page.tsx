'use client';

import React, { useEffect, useState } from 'react';

export default function ComicResultPage() {
  const [finalImage, setFinalImage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const generateComic = async () => {
      try {
        const inputs = localStorage.getItem('comicInputs');
        const selfieUrl = localStorage.getItem('selfieUrl');

        if (!inputs || !selfieUrl) {
          console.error('❌ Missing inputs or selfieUrl');
          setError('Missing input(s)');
          setLoading(false);
          return;
        }

        const parsed = JSON.parse(inputs);

        const payload = {
          ...parsed,
          selfieUrl,
        };

        console.log('📤 Sending to /api/generate:', payload);

        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to generate comic image');
        }

        console.log('✅ Comic image URL:', data.comicImageUrl);
        setFinalImage(data.comicImageUrl);
        setLoading(false);
      } catch (err: any) {
        console.error('🔥 Error:', err);
        setError(err.message || 'Something went wrong');
        setLoading(false);
      }
    };

    generateComic();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      {loading ? (
        <p className="text-lg animate-pulse">Generating your comic book cover...</p>
      ) : error ? (
        <div className="text-red-400 text-center">
          <p className="text-xl font-bold">❌ {error}</p>
        </div>
      ) : (
        <div className="w-full max-w-4xl">
          <h1 className="text-3xl font-bold mb-6 text-center">🎉 Your Comic Book Cover</h1>
          <img
            src={finalImage}
            alt="Generated Comic"
            className="w-full rounded-lg shadow-lg border border-white"
          />
        </div>
      )}
    </div>
  );
}
