'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
  {
    key: 'gender',
    label: '1. What is your gender?',
    type: 'select',
    options: ['Male', 'Female', 'Other'],
  },
  {
    key: 'childhood',
    label: '2. What word best describes your childhood?',
    type: 'text',
    placeholder: 'e.g., Invisible',
  },
  {
    key: 'superpower',
    label:
      '3. If you could awaken one extraordinary power within you, what would it be?',
    type: 'text',
    placeholder: 'e.g., Control time',
  },
  {
    key: 'city',
    label:
      '4. If your story began in any city in the world, which one would it be?',
    type: 'text',
    placeholder: 'e.g., Dubai',
  },
  {
    key: 'fear',
    label:
      '5. Your enemy is the embodiment of your deepest fear. What form does it take?',
    type: 'text',
    placeholder: 'e.g., Disappointing others',
  },
  {
    key: 'fuel',
    label:
      '6. What fuels you to keep going when everything feels impossible?',
    type: 'text',
    placeholder: 'e.g., My little sister’s smile',
  },
  {
    key: 'strength',
    label:
      '7. How would someone close to you describe your greatest strength?',
    type: 'text',
    placeholder: 'e.g., Calm under pressure',
  },
  {
    key: 'lesson',
    label:
      '8. What truth or lesson would you want your story to teach the world?',
    type: 'text',
    placeholder: 'e.g., Kindness is not weakness',
  },
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
  const [touched, setTouched] = useState(false);
  const total = QUESTIONS.length;

  // ---- Swipe state ----
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);
  const isSwiping = useRef(false);

  // Prefill from previous attempts
  useEffect(() => {
    try {
      const raw = localStorage.getItem('comicInputs');
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm(prev => ({ ...prev, ...parsed }));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const current = useMemo(() => QUESTIONS[step], [step]);
  const value = form[current.key] ?? '';
  const progressPct = Math.round(((step + 1) / total) * 100);
  const canNext = value.trim().length > 0;

  function updateField(val: string) {
    setForm(prev => ({ ...prev, [current.key]: val }));
    if (!touched) setTouched(true);
  }

  function goNext() {
    if (!canNext) {
      setTouched(true);
      return;
    }
    if (step < total - 1) {
      setStep(s => s + 1);
      setTouched(false);
    } else {
      // Final submit — preserve original behavior
      localStorage.removeItem('heroName');
      localStorage.removeItem('superheroName');
      localStorage.setItem('comicInputs', JSON.stringify(form));
      console.log('[Quiz] Saved comicInputs and cleared heroName keys:', form);
      router.push('/comic/selfie');
    }
  }

  function goBack() {
    if (step > 0) {
      setStep(s => s - 1);
      setTouched(false);
    }
  }

  // Keyboard shortcuts: Enter=next, Shift+Enter/back, arrows
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        goNext();
      } else if ((e.key === 'Enter' && e.shiftKey) || e.key === 'ArrowLeft') {
        e.preventDefault();
        goBack();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, form, canNext]);

  // ---- Swipe handlers (touch) ----
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    touchStartTime.current = Date.now();
    isSwiping.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!isSwiping.current || touchStartX.current == null || touchStartY.current == null) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;

    // If vertical movement dominates, let the page scroll (don’t treat as swipe)
    if (Math.abs(dy) > Math.abs(dx)) {
      isSwiping.current = false;
    }
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (!isSwiping.current || touchStartX.current == null || touchStartY.current == null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    const dt = Date.now() - touchStartTime.current;

    // Reset
    isSwiping.current = false;
    touchStartX.current = null;
    touchStartY.current = null;

    // Swipe threshold: horizontal > vertical, 50px distance, under 600ms feels snappy
    const horizontalDominant = Math.abs(dx) > Math.abs(dy);
    const farEnough = Math.abs(dx) > 50;
    const quickEnough = dt < 600;

    if (horizontalDominant && farEnough && quickEnough) {
      if (dx < 0) goNext(); // swipe left → next
      else goBack();        // swipe right → back
    }
  }

  return (
    <div
      className="w-full max-w-xl text-white px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),0.5rem)]"
    >
      <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-left drop-shadow-[2px_2px_3px_rgba(0,0,0,0.9)]">
        What is Your Origin Story?
      </h1>

      {/* Tracker + progress */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium drop-shadow" aria-live="polite">
          Q {step + 1}/{total}
        </div>
        <div className="w-2/3 h-2 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white/80 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Slider; background stays on the page, not here */}
      <div
        className="relative overflow-hidden rounded-md select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{ transform: `translateX(-${step * 100}%)` }}
        >
          {QUESTIONS.map((q, idx) => (
            <section
              key={q.key}
              aria-hidden={idx !== step}
              className="w-full shrink-0 space-y-3 px-1 sm:px-0"
            >
              <label className="block text-sm font-semibold text-white drop-shadow">
                {q.label}
              </label>

              {q.type === 'select' ? (
                <select
                  name={q.key}
                  value={form[q.key]}
                  onChange={(e) => updateField(e.target.value)}
                  required
                  style={{ fontSize: 16 }} // prevent iOS zoom
                  onFocus={(e) =>
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                  autoFocus={idx === step}
                  className="mt-1 block w-full rounded-md bg-black/60 text-white border border-white/30 shadow-sm focus:ring-purple-400 focus:border-purple-400"
                >
                  <option value="">Select...</option>
                  {q.options!.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  name={q.key}
                  value={form[q.key]}
                  onChange={(e) => updateField(e.target.value)}
                  placeholder={q.placeholder}
                  style={{ fontSize: 16 }} // prevent iOS zoom
                  onFocus={(e) =>
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'center' })
                  }
                  autoFocus={idx === step}
                  className="mt-1 block w-full rounded-md bg-black/60 text-white placeholder-gray-300 border border-white/30 shadow-sm focus:ring-purple-400 focus:border-purple-400"
                />
              )}

              {!canNext && touched && idx === step && (
                <p className="text-sm text-red-300">
                  Please fill this in to continue.
                </p>
              )}

              {/* Controls */}
              <div className="mt-4 sm:mt-4 sticky bottom-3 sm:static left-0 right-0">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={step === 0}
                    className={cx(
                      'px-4 py-3 rounded-md border',
                      step === 0
                        ? 'opacity-50 cursor-not-allowed border-white/30'
                        : 'hover:bg-white/10 border-white/40'
                    )}
                  >
                    Back
                  </button>

                  {/* Step dots */}
                  <div className="flex items-center gap-2">
                    {QUESTIONS.map((_, i) => (
                      <span
                        key={i}
                        className={cx(
                          'inline-block h-2 w-2 rounded-full bg-white',
                          i === step ? 'opacity-100' : 'opacity-40'
                        )}
                        aria-label={`Step ${i + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={goNext}
                    className="px-4 py-3 rounded-md bg-purple-600 hover:bg-purple-800 text-white font-bold shadow-lg transition w-full sm:w-auto"
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
        Tip: Swipe, tap <kbd className="px-1 py-0.5 rounded bg-white/10">Next</kbd>, or press{' '}
        <kbd className="px-1 py-0.5 rounded bg-white/10">Enter</kbd>.{' '}
        <span className="hidden sm:inline">
          Use <kbd className="px-1 py-0.5 rounded bg-white/10">Shift+Enter</kbd> or{' '}
          <kbd className="px-1 py-0.5 rounded bg-white/10">←</kbd> to go back.
        </span>
      </p>
    </div>
  );
}
