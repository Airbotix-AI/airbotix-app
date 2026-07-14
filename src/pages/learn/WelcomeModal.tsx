import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'airbotix.learn.welcomed';

const STEPS = [
  {
    emoji: '👋',
    title: 'Hi there!',
    body: "This is Airbotix Learn — a place to program stories, build projects, and create with AI.",
  },
  {
    emoji: '🧩',
    title: 'Start with Story Blocks',
    body: 'Snap picture blocks together to make characters move, talk, and play music. Story Blocks is free and needs no typing.',
  },
  {
    emoji: '⭐',
    title: 'Stars are your fuel',
    body: 'Every AI helper costs Stars. Your parent tops them up. Use them wisely — try one thing at a time and see what works.',
  },
  {
    emoji: '🎨',
    title: 'Pick a tool, make something',
    body: 'Choose Story Blocks, Creative Code, Image, Music, Voice, or Video. Each studio teaches a different skill.',
  },
];

export function WelcomeModal({ nickname }: { nickname: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      // ignore SSR / sandbox
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // ignore
    }
    setOpen(false);
  };

  if (!open) return null;
  const s = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-40 bg-ink/60 flex items-center justify-center p-6">
      <div className="auth-card max-w-md text-center" style={{ position: 'relative', zIndex: 1 }}>
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-[12px] font-semibold text-slate2 hover:text-ink"
        >
          Skip ×
        </button>
        <div className="text-[64px]">{s.emoji}</div>
        <h1 className="hero-display mt-4" style={{ fontSize: '32px' }}>
          {step === 0 ? `Hi ${nickname}!` : s.title}
        </h1>
        <p className="lead-text mt-4" style={{ fontSize: '16px' }}>
          {s.body}
        </p>

        <div className="mt-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 w-8 rounded-full transition-colors ${
                i === step ? 'bg-brand-coral' : 'bg-hairline'
              }`}
            />
          ))}
        </div>

        <div className="mt-8 flex gap-3 justify-center">
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
            <Link to="/learn/create" onClick={dismiss} className="btn-pill-primary">
              See all studios →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
