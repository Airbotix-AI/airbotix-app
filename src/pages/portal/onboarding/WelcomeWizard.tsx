import { type ReactNode, useEffect, useState } from 'react';

import { useMe } from '@/auth/useAuth';
import { getOnboardingFlag, setOnboardingFlag } from '@/lib/onboardingStorage';

interface Slide {
  emoji: string;
  grad: string; // K-12 gradient class for the icon chip
  eyebrow: string;
  eyebrowColor: string;
  title: string;
  body: ReactNode;
}

const SLIDES: Slide[] = [
  {
    emoji: '👋',
    grad: 'bg-grad-mint',
    eyebrow: 'Welcome',
    eyebrowColor: 'eyebrow-mint',
    title: 'Welcome to Airbotix',
    body: (
      <p>
        Airbotix is where your child learns by <strong>making real things</strong> with AI —
        pictures, stories, games, even code. A friendly AI coach guides them and asks questions,
        instead of doing the work for them.
      </p>
    ),
  },
  {
    emoji: '🔑',
    grad: 'bg-grad-sky',
    eyebrow: 'You decide',
    eyebrowColor: 'eyebrow-sky',
    title: "You're always in control",
    body: (
      <ul className="space-y-2">
        <li>
          • You decide how much AI time they get — we call it <strong>Stars ⭐</strong>.
        </li>
        <li>• You can see everything they make.</li>
        <li>• Big actions wait for your approval.</li>
        <li className="pt-1 text-ink">No surprises. You hold the keys.</li>
      </ul>
    ),
  },
  {
    emoji: '🚀',
    grad: 'bg-grad-coral',
    eyebrow: 'Next steps',
    eyebrowColor: 'eyebrow',
    title: '3 quick things to get going',
    body: (
      <ol className="space-y-2">
        <li>1. Log your child in on their device</li>
        <li>2. Add some Stars so they can start creating</li>
        <li>3. (Optional) Set daily limits for peace of mind</li>
        <li className="pt-1 text-ink">We&apos;ll walk you through each one on your home screen.</li>
      </ol>
    ),
  },
];

/**
 * One-time, full-screen, skippable welcome (parent-portal-onboarding-prd §4).
 * Self-gates: shows only for a parent-with-family who hasn't seen it. Closing
 * (Skip or "Let's go") sets the `welcomeSeen` flag so it never auto-shows again.
 */
export function WelcomeWizard() {
  const me = useMe();
  const user = me.data?.kind === 'user' ? me.data : null;
  const sub = user?.sub ?? '';
  const hasFamily = !!user?.family_id;

  // Read once on mount — we don't need this to be reactive, and closing uses
  // local state to hide immediately.
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);

  const shouldShow =
    !!user && hasFamily && !!sub && open && !getOnboardingFlag(sub, 'welcomeSeen');

  const close = () => {
    if (sub) setOnboardingFlag(sub, 'welcomeSeen');
    setOpen(false);
  };

  // Escape-to-close (matches expected modal behavior for keyboard users).
  useEffect(() => {
    if (!shouldShow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // close is stable enough; re-bind only when visibility changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow]);

  if (!shouldShow) return null;

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-ink/60 p-6"
      role="dialog"
      aria-modal="true"
    >
      <div className="auth-card relative w-full max-w-lg text-center">
        <button
          onClick={close}
          className="absolute right-4 top-4 text-[12px] font-semibold text-slate2 hover:text-ink"
        >
          Skip ×
        </button>

        <div
          aria-hidden="true"
          className={`mx-auto flex h-20 w-20 items-center justify-center rounded-hero ${slide.grad} text-[40px] shadow-card-soft`}
        >
          {slide.emoji}
        </div>

        <div className={`eyebrow ${slide.eyebrowColor} mt-6`}>{slide.eyebrow}</div>
        <h1 className="section-heading mt-1">{slide.title}</h1>
        <div className="lead-text mx-auto mt-4 max-w-md text-left" style={{ fontSize: '16px' }}>
          {slide.body}
        </div>

        <div className="mt-7 flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${
                i === step ? 'bg-brand-coral' : 'bg-hairline'
              }`}
            />
          ))}
        </div>

        <div className="mt-7 flex justify-center gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="btn-pill-secondary">
              ← Back
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setStep(step + 1)} className="btn-pill-primary">
              Next →
            </button>
          ) : (
            <button onClick={close} className="btn-pill-primary">
              Let&apos;s go →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
