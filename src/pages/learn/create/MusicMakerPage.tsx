import { useState } from 'react';

import { api } from '@/lib/api';
import { Celebration } from './shared/Celebration';
import { StudioChrome } from './shared/StudioChrome';
import { SessionSummary } from './shared/SessionSummary';
import { StudioTip } from './shared/StudioTip';
import { useExitSummary, useStudioSession } from './shared/useSession';
import { friendlyError, useGenerate, useRecentArtifacts, type Artifact } from './shared/useStudio';

const MOODS = ['happy', 'epic', 'calm', 'sad', 'spooky', 'funny'] as const;
const TEMPOS = [
  { id: 'slow', label: 'Slow', bpm: '60-80 bpm' },
  { id: 'medium', label: 'Medium', bpm: '90-120 bpm' },
  { id: 'fast', label: 'Fast', bpm: '130-160 bpm' },
] as const;
const COST = 3;

export function MusicMakerPage() {
  const [prompt, setPrompt] = useState('');
  const [mood, setMood] = useState<typeof MOODS[number]>('happy');
  const [tempo, setTempo] = useState<typeof TEMPOS[number]['id']>('medium');
  const [duration, setDuration] = useState(20);
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const { sessionId } = useStudioSession('music');
  const { summary, endNow, dismiss } = useExitSummary();

  const generate = useGenerate('music');
  const recent = useRecentArtifacts('audio');

  const onMake = () => {
    if (!prompt.trim()) {
      setError('Tell me what kind of music you want.');
      return;
    }
    setError(null);
    const fullPrompt = `${prompt.trim()}, ${mood} mood, ${tempo} tempo, ${duration}s`;
    generate.mutate(
      { prompt: fullPrompt, options: { mood, tempo, duration } },
      { onSuccess: () => setShowCelebrate(true), onError: (e) => setError(friendlyError(e)) },
    );
  };

  return (
    <StudioChrome
      eyebrow="Music Maker"
      eyebrowColor="eyebrow-mint"
      emoji="🎵"
      title="Music Maker"
      subtitle="Tell the AI what your song is about + what feeling. It'll compose a short track."
      cost={COST}
    >
      <Celebration show={showCelebrate} message="Your song is ready!" onDone={() => setShowCelebrate(false)} />
      <StudioTip
        color="mint"
        tipTitle="Music = topic + mood + tempo"
        tipBody={"Pick a topic (what's the song about), a mood (how it feels), and tempo (fast or slow). Mix them like ingredients!"}
        examples={[
          { text: 'A space adventure theme', hint: 'classic epic' },
          { text: 'Quiet morning forest with birds', hint: 'calm' },
          { text: 'Robot dance party', hint: 'fun + fast' },
          { text: 'Sad goodbye to a friend', hint: 'emotional' },
          { text: 'Spooky haunted castle', hint: 'spooky' }
        ]}
        onPick={(t) => setPrompt(t)}
      />

      <div className="card-base mb-6">
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
          <div className="flex flex-wrap gap-2">
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
          <div className="flex gap-2">
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
              type="range"
              min={10}
              max={60}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full accent-brand-mint"
            />
          </label>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}

        <button onClick={onMake} disabled={generate.isPending} className="btn-pill-primary w-full mt-6">
          {generate.isPending ? '🎵 Composing…' : `🎵 Compose −${COST}★`}
        </button>
      </div>

      <h2 className="text-[18px] font-bold text-ink mb-3">Your recent music</h2>
      {recent.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : (recent.data?.length ?? 0) === 0 ? (
        <div className="card-base text-center">
          <span className="sticker-mint">No tracks yet</span>
          <p className="lead-text mt-3" style={{ fontSize: '14px' }}>Tap Compose to make your first song.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recent.data!.slice(0, 10).map((a) => (
            <AudioRow key={a.id} artifact={a} />
          ))}
        </div>
      )}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => endNow(sessionId)}
          className="btn-pill-secondary"
        >
          🎓 Done for now
        </button>
      </div>
      {summary && <SessionSummary summary={summary} onClose={dismiss} />}
    </StudioChrome>
  );
}

function AudioRow({ artifact }: { artifact: Artifact }) {
  const [url, setUrl] = useState<string | null>(null);
  if (!url) {
    api<{ url: string }>(`/projects/${artifact.project_id}/artifacts/${artifact.id}/download-url`, {
      method: 'POST',
    })
      .then((r) => setUrl(r.url))
      .catch(() => undefined);
  }
  const meta = artifact.metadata as { prompt?: string };
  return (
    <div className="card-base flex items-center gap-4">
      <div className="flex-1 min-w-0">
        {meta.prompt && (
          <div className="text-[13px] font-bold text-ink truncate">"{meta.prompt}"</div>
        )}
        <div className="text-[11px] text-slate2 mt-1">
          {new Date(artifact.created_at).toLocaleString()}
        </div>
        {url ? (
          <audio controls className="w-full mt-2">
            <source src={url} type={artifact.mime_type} />
          </audio>
        ) : (
          <span className="text-[12px] text-slate2">loading…</span>
        )}
      </div>
    </div>
  );
}
