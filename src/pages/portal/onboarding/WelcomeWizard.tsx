import { type ReactNode, useEffect, useState } from 'react';

import { useMe } from '@/auth/useAuth';
import { getOnboardingFlag, setOnboardingFlag } from '@/lib/onboardingStorage';
import { onOpenWelcomeTour } from './welcomeTour';

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
        Airbotix is where your child <strong>learns by making real things</strong> with AI —
        animated stories, music, games, even code. The AI is a coach that asks questions
        and guides — it never just does the work for them.
      </p>
    ),
  },
  {
    emoji: '🎨',
    grad: 'bg-grad-bubblegum',
    eyebrow: 'What they make',
    eyebrowColor: 'eyebrow-bubblegum',
    title: 'What your child will make & learn',
    body: (
      <ul className="space-y-2">
        <li>
          🧩 <strong>Story Blocks</strong> — program animated stories with snap-together blocks
        </li>
        <li>
          🎵 <strong>Music</strong> — compose real songs on their own Music Stage
        </li>
        <li>
          💻 <strong>Code & Games</strong> — build real games and apps they can play and share
        </li>
        <li className="text-ink-soft">
          🎨 Image, voice & video studios are <strong>coming soon</strong>
        </li>
        <li className="pt-1 text-ink">
          Along the way they build <strong>creativity, AI literacy, and problem-solving</strong> —
          by directing the AI, not copying it.
        </li>
      </ul>
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
 * Full-screen, skippable welcome tour (parent-portal-onboarding-prd §4).
 * Auto-opens once for a parent-with-family who hasn't seen it (`welcomeSeen`
 * flag), and can be re-opened any time via `openWelcomeTour()` (Dashboard
 * "How it works" button) so the explanation is never lost after the first skip.
 */
export function WelcomeWizard() {
  const me = useMe();
  const user = me.data?.kind === 'user' ? me.data : null;
  const sub = user?.sub ?? '';
  const hasFamily = !!user?.family_id;
  const ready = !!user && hasFamily && !!sub;

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Auto-open once, the first time a set-up parent lands here.
  useEffect(() => {
    if (ready && !getOnboardingFlag(sub, 'welcomeSeen')) setOpen(true);
  }, [ready, sub]);

  // Re-open on demand (e.g. "How it works").
  useEffect(
    () =>
      onOpenWelcomeTour(() => {
        setStep(0);
        setOpen(true);
      }),
    [],
  );

  const shouldShow = ready && open;

  const close = () => {
    if (sub) setOnboardingFlag(sub, 'welcomeSeen');
    setOpen(false);
  };

  // Escape-to-close.
  useEffect(() => {
    if (!shouldShow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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
