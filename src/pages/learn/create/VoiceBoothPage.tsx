import { useState } from 'react';

import { api } from '@/lib/api';
import { Celebration } from './shared/Celebration';
import { StudioChrome } from './shared/StudioChrome';
import { SessionSummary } from './shared/SessionSummary';
import { StudioTip } from './shared/StudioTip';
import { useStudioSession } from './shared/useSession';
import { friendlyError, useGenerate, useRecentArtifacts, type Artifact } from './shared/useStudio';

const VOICES = [
  { id: 'alloy', emoji: '🧑', name: 'Alloy', desc: 'Friendly neutral' },
  { id: 'echo', emoji: '🧒', name: 'Echo', desc: 'Young energetic' },
  { id: 'fable', emoji: '🎭', name: 'Fable', desc: 'Storytelling' },
  { id: 'nova', emoji: '👩', name: 'Nova', desc: 'Warm female' },
  { id: 'onyx', emoji: '🧔', name: 'Onyx', desc: 'Deep male' },
] as const;

const SPEEDS = [
  { id: '0.8', label: 'Slow' },
  { id: '1.0', label: 'Normal' },
  { id: '1.2', label: 'Fast' },
] as const;

const COST = 1;

export function VoiceBoothPage() {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<typeof VOICES[number]['id']>('alloy');
  const [speed, setSpeed] = useState<typeof SPEEDS[number]['id']>('1.0');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const { summary, endNow, dismiss } = useStudioSession('voice');

  const generate = useGenerate('tts');
  const recent = useRecentArtifacts('audio');

  const onMake = () => {
    if (!text.trim()) {
      setError('Type something to speak.');
      return;
    }
    setError(null);
    generate.mutate(
      { prompt: text.trim(), voice, options: { speed: Number(speed) } },
      { onSuccess: () => setShowCelebrate(true), onError: (e) => setError(friendlyError(e)) },
    );
  };

  return (
    <StudioChrome
      eyebrow="Voice Booth"
      eyebrowColor="eyebrow-sky"
      emoji="🔊"
      title="Voice Booth"
      subtitle="Type anything. The AI reads it out loud. Pick a voice that fits the mood."
      cost={COST}
    >
      <Celebration show={showCelebrate} message="Your voice clip is ready!" onDone={() => setShowCelebrate(false)} />
      <StudioTip
        color="sky"
        tipTitle="Make it sound real: punctuation + voice match"
        tipBody={'Use punctuation! Commas = small pause. Period = big pause. Pick a voice that matches the feeling.'}
        examples={[
          { text: 'Once upon a time, a brave little dragon went on a quest.', hint: 'classic story opener' },
          { text: 'Three, two, one… LIFTOFF!', hint: 'countdown drama' },
          { text: 'Welcome to my show! Today we are talking about robots.', hint: 'announcer voice' },
          { text: 'Hello! My name is Mia, and I love AI art.', hint: 'self-intro' },
          { text: 'Psst… the secret password is banana.', hint: 'whisper effect' }
        ]}
        onPick={(t) => setText(t)}
      />

      <div className="card-base mb-6">
        <label className="block">
          <span className="label-k12">What do you want to say?</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Once upon a time, a brave little dragon…"
            className="input-k12"
            autoFocus
          />
          <span className="text-[11px] text-slate2 mt-1 block">
            {text.length}/500 characters
          </span>
        </label>

        <div className="mt-5">
          <span className="label-k12">Voice</span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={`rounded-2xl px-3 py-3 text-center transition-colors ${
                  voice === v.id
                    ? 'bg-grad-sky text-white shadow-brand-sky'
                    : 'bg-surface text-ink-soft hover:bg-wash-sky'
                }`}
              >
                <div className="text-[24px]">{v.emoji}</div>
                <div className="text-[13px] font-bold mt-1">{v.name}</div>
                <div className="text-[10px] opacity-75">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <span className="label-k12">Speed</span>
          <div className="flex gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSpeed(s.id)}
                className={`rounded-2xl px-4 py-2 text-[13px] font-bold transition-colors flex-1 ${
                  speed === s.id
                    ? 'bg-grad-sky text-white shadow-brand-sky'
                    : 'bg-surface text-ink-soft hover:bg-wash-sky'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}

        <button onClick={onMake} disabled={generate.isPending} className="btn-pill-primary w-full mt-6">
          {generate.isPending ? '🔊 Speaking…' : `🔊 Speak it −${COST}★`}
        </button>
      </div>

      <h2 className="text-[18px] font-bold text-ink mb-3">Your recent voice clips</h2>
      {recent.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : (recent.data?.length ?? 0) === 0 ? (
        <div className="card-base text-center">
          <span className="sticker-sky">No clips yet</span>
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
          onClick={() => endNow()}
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
    }).then((r) => setUrl(r.url)).catch(() => undefined);
  }
  const meta = artifact.metadata as { prompt?: string };
  return (
    <div className="card-base">
      {meta.prompt && (
        <div className="text-[13px] text-ink mb-2 line-clamp-2">"{meta.prompt}"</div>
      )}
      {url ? (
        <audio controls className="w-full">
          <source src={url} type={artifact.mime_type} />
        </audio>
      ) : (
        <span className="text-[12px] text-slate2">loading…</span>
      )}
      <div className="text-[11px] text-slate2 mt-1">
        {new Date(artifact.created_at).toLocaleString()}
      </div>
    </div>
  );
}
