import { useState } from 'react';

import { Celebration } from './Celebration';
import { FreeBadge } from './FreeBadge';
import { StudioTip } from './StudioTip';
import { friendlyError, useGenerate } from './useStudio';

const MOODS = ['happy', 'epic', 'calm', 'sad', 'spooky', 'funny'] as const;
const TEMPOS = [
  { id: 'slow',   label: 'Slow',   bpm: '60-80 bpm' },
  { id: 'medium', label: 'Medium', bpm: '90-120 bpm' },
  { id: 'fast',   label: 'Fast',   bpm: '130-160 bpm' },
] as const;
const COST = 3;

export function MusicStudioContent({
  projectId,
  aiFreeNow = false,
  onCreated,
}: {
  projectId: string;
  /** Workshop-free-AI waiver (D-WFA-01) — show "Free" in place of the star cost. */
  aiFreeNow?: boolean;
  onCreated: () => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [mood, setMood] = useState<typeof MOODS[number]>('happy');
  const [tempo, setTempo] = useState<typeof TEMPOS[number]['id']>('medium');
  const [duration, setDuration] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const generate = useGenerate('music');

  const onMake = () => {
    if (!prompt.trim()) { setError('Tell me what kind of music you want.'); return; }
    setError(null);
    generate.mutate(
      {
        prompt: `${prompt.trim()}, ${mood} mood, ${tempo} tempo, ${duration}s`,
        project_id: projectId,
        options: { mood, tempo, duration },
      },
      {
        onSuccess: () => { setShowCelebrate(true); onCreated(); setPrompt(''); },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  return (
    <div>
      <Celebration show={showCelebrate} message="Music added to your project!" onDone={() => setShowCelebrate(false)} />

      <StudioTip
        color="mint"
        tipTitle="Music = topic + mood + tempo"
        tipBody="Pick a topic (what's the song about), a mood (how it feels), and tempo (fast or slow). Mix them like ingredients!"
        examples={[
          { text: 'A space adventure theme', hint: 'classic epic' },
          { text: 'Quiet morning forest with birds', hint: 'calm' },
          { text: 'Robot dance party', hint: 'fun + fast' },
          { text: 'Spooky haunted castle', hint: 'spooky' },
        ]}
        onPick={(t) => setPrompt(t)}
      />

      <div className="card-base mb-4">
        <label className="block">
          <span className="label-k12">What's the song about?</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            placeholder="A robot dancing in the rain"
            className="input-k12"
            autoFocus
          />
        </label>

        <div className="mt-5">
          <span className="label-k12">Mood</span>
          <div className="flex flex-wrap gap-2 mt-1">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                className={`rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${
                  mood === m
                    ? 'bg-grad-mint text-white shadow-brand-mint'
                    : 'bg-surface text-ink-soft hover:bg-wash-mint hover:text-ink'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <span className="label-k12">Tempo</span>
          <div className="flex gap-2 mt-1">
            {TEMPOS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTempo(t.id)}
                className={`rounded-2xl px-4 py-3 text-left transition-colors flex-1 ${
                  tempo === t.id
                    ? 'bg-grad-mint text-white shadow-brand-mint'
                    : 'bg-surface text-ink-soft hover:bg-wash-mint'
                }`}
              >
                <div className="text-[14px] font-bold">{t.label}</div>
                <div className="text-[11px] opacity-75">{t.bpm}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <label className="block">
            <span className="label-k12">Length — {duration}s</span>
            <input
              type="range" min={10} max={60} step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-brand-mint mt-1"
            />
          </label>
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
          {generate.isPending ? (
            '🎵 Composing…'
          ) : aiFreeNow ? (
            <span className="inline-flex items-center gap-1.5">🎵 Compose <FreeBadge /></span>
          ) : (
            `🎵 Compose — ${COST}★`
          )}
        </button>
      </div>
    </div>
  );
}
