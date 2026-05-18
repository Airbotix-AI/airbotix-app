import { useState } from 'react';

interface ExamplePrompt {
  text: string;
  hint?: string;
}

interface StudioTipProps {
  examples: ExamplePrompt[];
  tipTitle: string;
  tipBody: string;
  color: 'bubblegum' | 'mint' | 'sky' | 'sunshine';
  onPick: (text: string) => void;
}

/**
 * Inline tutorial — example prompts + tip card. Lives above the form so kids
 * see a concrete demonstration before they type.
 */
export function StudioTip({ examples, tipTitle, tipBody, color, onPick }: StudioTipProps) {
  const [open, setOpen] = useState(true);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-[13px] font-semibold text-brand-coral hover:underline mb-4"
      >
        💡 Show tips & examples
      </button>
    );
  }

  return (
    <div className={`card-base mb-6 bg-wash-${color} border-2 border-brand-${color}/30`}>
      <div className="flex items-start justify-between">
        <div className="eyebrow">💡 {tipTitle}</div>
        <button
          onClick={() => setOpen(false)}
          className="text-[12px] font-semibold text-slate2 hover:text-ink"
        >
          Hide
        </button>
      </div>
      <p className="text-[14px] text-ink mt-2 leading-relaxed">{tipBody}</p>
      <div className="mt-4">
        <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold mb-2">
          Try one of these:
        </div>
        <div className="flex flex-wrap gap-2">
          {examples.map((ex) => (
            <button
              key={ex.text}
              onClick={() => onPick(ex.text)}
              title={ex.hint}
              className="rounded-2xl bg-canvas-pure px-3 py-2 text-[12px] text-ink-soft hover:bg-canvas hover:text-ink hover:-translate-y-0.5 transition-all text-left max-w-xs"
            >
              {ex.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
