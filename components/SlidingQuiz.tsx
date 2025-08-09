'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type FieldKey =
  | 'gender'
  | 'childhood'
  | 'superpower'
  | 'city'
  | 'fear'
  | 'fuel'
  | 'strength'
  | 'lesson';

type FormState = Record<FieldKey, string>;

const QUESTIONS: {
  key: FieldKey;
  label: string;
  type: 'select' | 'text';
  placeholder?: string;
  options?: string[];
}[] = [
  { key: 'gender', label: '1. What is your gender?', type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'childhood', label: '2. What word best describes your childhood?', type: 'text', placeholder: 'e.g., Invisible' },
  { key: 'superpower', label: '3. If you could awaken one extraordinary power within you, what would it be?', type: 'text', placeholder: 'e.g., Control time' },
  { key: 'city', label: '4. If your story began in any city in the world, which one would it be?', type: 'text', placeholder: 'e.g., Dubai' },
  { key: 'fear', label: '5. Your enemy is the embodiment of your deepest fear. What form does it take?', type: 'text', placeholder: 'e.g., Snake, Wolf, Ghost, etc.' },
  { key: 'fuel', label: '6. What fuels you to keep going when everything feels impossible?', type: 'text', placeholder: 'e.g., My little sister’s smile' },
  { key: 'strength', label: '7. How would someone close to you describe your greatest strength?', type: 'text', placeholder: 'e.g., Calm under pressure' },
  { key: 'lesson', label: '8. What truth or lesson would you want your story to teach the world?', type: 'text', placeholder: 'e.g., Kindness is not weakness' },
];

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function SlidingQuiz() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    gender: '',
    childhood: '',
    superpower: '',
    city: '',
    fear: '',
    fuel: '',
    strength: '',
    lesson: '',
  });

  const [step, setStep] = useState(0);
  const total = QUESTIONS.length;

  // Prefill from previous attempts (works for desktop & mobile; we only block browser autofill, not our own)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('comicInputs');
      if (raw) {
        setForm(prev => ({ ...prev, ...JSON.parse(raw) }));
      }
    } catch { /* ignore */ }
  }, []);

  const current = useMemo(() => QUESTIONS[step], [step]);
  const progressPct = Math.round(((step + 1) / total) * 100);

  function updateField(val: string) {
    setForm(prev => ({ ...prev, [current.key]: val }));
  }

  function goNext() {
    if (step < total - 1) {
      setStep(s => s + 1);
    } else {
      // Final submit — keep original behavior
      try {
        localStorage.removeItem('heroName');
        localStorage.removeItem('superheroName');
        localStorage.setItem('comicInputs', JSON.stringify(form));
      } catch {}
      console.log('[Quiz] Saved comicInputs and cleared heroName keys:', form);
      router.push('/comic/selfie');
    }
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1);
  }

  // Keyboard shortcuts: Enter=next, Shift+Enter/back, arrows
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); goNext(); }
      else if ((e.key === 'Enter' && e.shiftKey) || e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, form]);

  return (
    <div className="w-full max-w-xl text-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),0.5rem)]">
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-left drop-shadow-[2px_2px_3px_rgba(0,0,0,0.9)]">
        What is Your Origin Story?
      </h1>

      {/* Tracker + progress */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium drop-shadow" aria-live="polite">
          Q {step + 1}/{total}
        </div>
        <div className="w-2/3 h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-white/80 rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Slider; background stays on the page */}
      <div className="relative overflow-hidden rounded-md">
        <div className="flex transition-transform duration-300 ease-in-out" style={{ transform: `translateX(-${step * 100}%)` }}>
          {QUESTIONS.map((q, idx) => (
            <section key={q.key} aria-hidden={idx !== step} className="w-full shrink-0 space-y-3 px-1 sm:px-0">
              <label className="block text-sm font-semibold text-white drop-shadow">{q.label}</label>

              {q.type === 'select' ? (
                <select
                  name={q.key}
                  value={form[q.key]}
                  onChange={(e) => updateField(e.target.value)}
                  // Prevent mobile browser autofill/suggestions
                  autoComplete="off"
                  style={{ fontSize: 16 }} // prevent iOS zoom
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  autoFocus={idx === step}
                  className="mt-1 block w-full rounded-md bg-black/60 text-white border border-white/30 shadow-sm focus:ring-purple-400 focus:border-purple-400"
                >
                  <option value="">Select...</option>
                  {q.options!.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  type="text"
                  name={q.key}
                  value={form[q.key]}
                  onChange={(e) => updateField(e.target.value)}
                  placeholder={q.placeholder}
                  // Prevent mobile/browser auto-answering
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="text"
                  style={{ fontSize: 16 }} // prevent iOS zoom
                  onFocus={(e) => e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  autoFocus={idx === step}
                  className="mt-1 block w-full rounded-md bg-black/60 text-white placeholder-gray-300 border border-white/30 shadow-sm focus:ring-purple-400 focus:border-purple-400"
                />
              )}

              {/* Controls */}
              <div className="mt-4 sm:mt-4 sticky bottom-3 sm:static left-0 right-0">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={step === 0}
                    className={cx(
                      'px-3 py-2 rounded-md border text-sm',
                      step === 0 ? 'opacity-50 cursor-not-allowed border-white/30' : 'hover:bg-white/10 border-white/40'
                    )}
                  >
                    Back
                  </button>

                  {/* Step dots */}
                  <div className="flex items-center gap-2">
                    {QUESTIONS.map((_, i) => (
                      <span
                        key={i}
                        className={cx('inline-block h-2 w-2 rounded-full bg-white', i === step ? 'opacity-100' : 'opacity-40')}
                        aria-label={`Step ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={goNext}
                    className="px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-800 text-white font-bold shadow-lg transition text-sm"
                  >
                    {step === total - 1 ? 'Finish' : 'Next'}
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      {/* Hints */}
      <p className="mt-4 text-sm opacity-80">
        Tip: Tap <kbd className="px-1 py-0.5 rounded bg-white/10">Next</kbd> or press{' '}
        <kbd className="px-1 py-0.5 rounded bg-white/10">Enter</kbd>.{' '}
        <span className="hidden sm:inline">
          Use <kbd className="px-1 py-0.5 rounded bg-white/10">Shift+Enter</kbd> or <kbd className="px-1 py-0.5 rounded bg-white/10">←</kbd> to go back.
        </span>
      </p>
    </div>
  );
}
