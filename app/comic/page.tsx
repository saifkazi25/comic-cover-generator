'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ComicPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    gender: '',
    childhood: '',
    superpower: '',
    city: '',
    fear: '',
    fuel: '',
    strength: '',
    lesson: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allFilled = Object.values(formData).every(val => val.trim() !== '');
    if (!allFilled) {
      alert('Please fill in all fields.');
      return;
    }

    localStorage.setItem('comicInputs', JSON.stringify(formData));
    router.push('/comic/selfie');
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-start justify-start p-10"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <form onSubmit={handleSubmit} className="w-full max-w-xl space-y-5 text-white">
        <h1 className="text-4xl font-bold mb-6 text-left drop-shadow-[2px_2px_3px_rgba(0,0,0,0.9)]">
          What is Your Origin Story?
        </h1>

        {[
          ['gender', '1. What is your gender?', 'e.g., Male / Female / Non-binary'],
          ['childhood', '2. What word best describes your childhood?', 'e.g., Invisible'],
          ['superpower', '3. If you could awaken one extraordinary power within you, what would it be?', 'e.g., Control time'],
          ['city', '4. If your story began in any city in the world, which one would it be?', 'e.g., Dubai'],
          ['fear', '5. What fear or challenge have you always wished you could rise above?', 'e.g., Disappointing others'],
          ['fuel', '6. What fuels you to keep going when everything feels impossible?', 'e.g., My little sister’s smile'],
          ['strength', '7. How would someone close to you describe your greatest strength?', 'e.g., Calm under pressure'],
          ['lesson', '8. What truth or lesson would you want your story to teach the world?', 'e.g., Kindness is not weakness'],
        ].map(([name, label, placeholder]) => (
          <div key={name}>
            <label className="block text-sm font-semibold text-white drop-shadow">{label}</label>
            <input
              type="text"
              name={name}
              value={formData[name as keyof typeof formData]}
              onChange={handleChange}
              placeholder={placeholder}
              className="mt-1 block w-full rounded-md bg-black/60 text-white placeholder-gray-300 border border-white/30 shadow-sm focus:ring-purple-400 focus:border-purple-400"
            />
          </div>
        ))}

        <button
          type="submit"
          className="w-full mt-6 bg-purple-600 hover:bg-purple-800 text-white font-bold py-2 px-4 rounded-md shadow-lg transition"
        >
          Next
        </button>
      </form>
    </div>
  );
}
