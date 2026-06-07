import { useState } from 'react';

import { Celebration } from './Celebration';
import { StudioTip } from './StudioTip';
import { friendlyError, useGenerate } from './useStudio';

const STYLES = ['cartoon', 'painting', 'pixel-art', 'photo', 'sketch', 'watercolor'] as const;
const SIZES = [
  { id: 'square', label: 'Square', dims: '512×512' },
  { id: 'wide',   label: 'Wide',   dims: '768×432' },
  { id: 'tall',   label: 'Tall',   dims: '432×768' },
] as const;
const COST = 4;

export function ImageStudioContent({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<typeof STYLES[number]>('cartoon');
  const [size, setSize] = useState<typeof SIZES[number]['id']>('square');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const generate = useGenerate('image');

  const onMake = () => {
    if (!prompt.trim()) { setError('Type what you want to draw first.'); return; }
    setError(null);
    generate.mutate(
      { prompt: `${prompt.trim()}, ${style} style`, project_id: projectId, options: { size } },
      {
        onSuccess: () => { setShowCelebrate(true); onCreated(); setPrompt(''); },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  return (
    <div>
      <Celebration show={showCelebrate} message="Image added to your project!" onDone={() => setShowCelebrate(false)} />

      <StudioTip
        color="bubblegum"
        tipTitle="WHO + WHERE + FEELING"
        tipBody="Best AI images come from describing a character, a place, and a mood. The more vivid, the better."
        examples={[
          { text: 'A friendly robot watering plants in space', hint: 'character + place' },
          { text: 'A cozy library with a sleeping cat, warm lamp light', hint: 'place + mood' },
          { text: 'A dragon flying over a glowing city at night', hint: 'character + scene' },
          { text: 'A pixel-art knight saving a vegetable kingdom', hint: 'silly story prompt' },
        ]}
        onPick={(t) => setPrompt(t)}
      />

      <div className="card-base mb-4">
        <label className="block">
          <span className="label-k12">What should I draw?</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="A friendly robot watering plants in space"
            className="input-k12"
            autoFocus
          />
        </label>

        <div className="mt-5">
          <span className="label-k12">Style</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                  style === s
                    ? 'bg-grad-bubblegum text-white shadow-brand-bubblegum'
                    : 'bg-surface text-ink-soft hover:bg-wash-bubblegum hover:text-ink'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <span className="label-k12">Size</span>
          <div className="flex gap-2 mt-1">
            {SIZES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSize(s.id)}
                className={`rounded-2xl px-4 py-3 text-left transition-colors flex-1 ${
                  size === s.id
                    ? 'bg-grad-bubblegum text-white shadow-brand-bubblegum'
                    : 'bg-surface text-ink-soft hover:bg-wash-bubblegum'
                }`}
              >
                <div className="text-[14px] font-bold">{s.label}</div>
                <div className="text-[11px] opacity-75">{s.dims}</div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}

        <button
          onClick={onMake}
          disabled={generate.isPending}
          className="btn-pill-primary w-full mt-6"
        >
          {generate.isPending ? '✨ Making…' : `✨ Make it — ${COST}★`}
        </button>
      </div>
    </div>
  );
}
