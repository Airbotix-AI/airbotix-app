import { useState } from 'react';

import { Celebration } from './Celebration';
import { StudioTip } from './StudioTip';
import { friendlyError, useGenerate } from './useStudio';

// Match exact options from VideoStudioPage
const DURATIONS = [
  { id: 4,  label: '4 seconds' },
  { id: 8,  label: '8 seconds' },
  { id: 12, label: '12 seconds' },
] as const;

const VIBES = ['cinematic', 'cartoon', '3d-animated', 'stop-motion', 'doodle'] as const;

const COST = 5;

export function VideoStudioContent({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<typeof DURATIONS[number]['id']>(4);
  const [vibe, setVibe] = useState<typeof VIBES[number]>('cartoon');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const generate = useGenerate('video');

  const onMake = () => {
    if (!prompt.trim()) { setError('Describe the scene you want to film.'); return; }
    setError(null);
    generate.mutate(
      { prompt: `${prompt.trim()}, ${vibe} style`, project_id: projectId, options: { duration } },
      {
        onSuccess: () => { setShowCelebrate(true); onCreated(); setPrompt(''); },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  return (
    <div>
      <Celebration show={showCelebrate} message="Video added to your project!" onDone={() => setShowCelebrate(false)} />

      <StudioTip
        color="sunshine"
        tipTitle="Video = simple scene + camera direction"
        tipBody="Videos work best with ONE clear scene. Add camera details: 'close-up', 'wide shot', 'spinning around'."
        examples={[
          { text: 'A baby dinosaur learning to roar in a misty jungle', hint: 'character story' },
          { text: 'Close-up of a flower blooming, time-lapse', hint: 'time-lapse' },
          { text: 'A paper airplane flying through a colorful tunnel', hint: 'motion scene' },
          { text: 'Stop-motion clay robot dancing', hint: 'style mention' },
        ]}
        onPick={(t) => setPrompt(t)}
      />

      <div className="card-base mb-4">
        <label className="block">
          <span className="label-k12">Describe the scene</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="A baby dinosaur learning to roar in a misty jungle"
            className="input-k12"
            autoFocus
          />
        </label>

        <div className="mt-5">
          <span className="label-k12">Style</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {VIBES.map((v) => (
              <button
                key={v}
                onClick={() => setVibe(v)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                  vibe === v
                    ? 'bg-grad-sunshine text-ink shadow-brand-sunshine'
                    : 'bg-surface text-ink-soft hover:bg-wash-sunshine hover:text-ink'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <span className="label-k12">Length</span>
          <div className="flex gap-2 mt-1">
            {DURATIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDuration(d.id)}
                className={`rounded-2xl px-4 py-3 text-[14px] font-bold transition-colors flex-1 ${
                  duration === d.id
                    ? 'bg-grad-sunshine text-ink shadow-brand-sunshine'
                    : 'bg-surface text-ink-soft hover:bg-wash-sunshine'
                }`}
              >
                {d.label}
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
          {generate.isPending ? '🎬 Filming…' : `🎬 Film it — ${COST}★`}
        </button>
        <p className="text-[11px] text-steel mt-3">
          ⏱ Video takes 30-60s to generate. Hang tight.
        </p>
      </div>
    </div>
  );
}
