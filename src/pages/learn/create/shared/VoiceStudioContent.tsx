import { useState } from 'react';

import { Celebration } from './Celebration';
import { StudioTip } from './StudioTip';
import { friendlyError, useGenerate } from './useStudio';

const VOICES = [
  { id: 'alloy', emoji: '🧑', name: 'Alloy', desc: 'Friendly neutral' },
  { id: 'echo',  emoji: '🧒', name: 'Echo',  desc: 'Young energetic' },
  { id: 'fable', emoji: '🎭', name: 'Fable', desc: 'Storytelling' },
  { id: 'nova',  emoji: '👩', name: 'Nova',  desc: 'Warm female' },
  { id: 'onyx',  emoji: '🧔', name: 'Onyx',  desc: 'Deep male' },
] as const;

const SPEEDS = [
  { id: '0.8', label: 'Slow' },
  { id: '1.0', label: 'Normal' },
  { id: '1.2', label: 'Fast' },
] as const;

const COST = 1;

export function VoiceStudioContent({
  projectId,
  onCreated,
}: {
  projectId: string;
  onCreated: () => void;
}) {
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<typeof VOICES[number]['id']>('alloy');
  const [speed, setSpeed] = useState<typeof SPEEDS[number]['id']>('1.0');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const generate = useGenerate('tts');

  const onMake = () => {
    if (!text.trim()) { setError('Type something to speak.'); return; }
    setError(null);
    generate.mutate(
      { prompt: text.trim(), project_id: projectId, options: { voice, speed: Number(speed) } },
      {
        onSuccess: () => { setShowCelebrate(true); onCreated(); setText(''); },
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  return (
    <div>
      <Celebration show={showCelebrate} message="Voice clip added to your project!" onDone={() => setShowCelebrate(false)} />

      <StudioTip
        color="sky"
        tipTitle="Punctuation = pacing"
        tipBody="Commas = small pause. Period = big pause. Pick a voice that matches the feeling."
        examples={[
          { text: 'Once upon a time, a brave little dragon went on a quest.', hint: 'story opener' },
          { text: 'Three, two, one… LIFTOFF!', hint: 'countdown drama' },
          { text: 'Welcome to my show! Today we are talking about robots.', hint: 'announcer' },
          { text: 'Psst… the secret password is banana.', hint: 'whisper effect' },
        ]}
        onPick={(t) => setText(t)}
      />

      <div className="card-base mb-4">
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
          <span className="text-[11px] text-steel mt-1 block">{text.length}/500</span>
        </label>

        <div className="mt-5">
          <span className="label-k12">Voice</span>
          <div className="grid grid-cols-5 gap-2 mt-1">
            {VOICES.map((v) => (
              <button
                key={v.id}
                onClick={() => setVoice(v.id)}
                className={`rounded-2xl px-2 py-3 text-center transition-colors ${
                  voice === v.id
                    ? 'bg-grad-sky text-white shadow-brand-sky'
                    : 'bg-surface text-ink-soft hover:bg-wash-sky'
                }`}
              >
                <div className="text-[20px]">{v.emoji}</div>
                <div className="text-[11px] font-bold mt-1">{v.name}</div>
                <div className="text-[9px] opacity-75">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <span className="label-k12">Speed</span>
          <div className="flex gap-2 mt-1">
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

        <button
          onClick={onMake}
          disabled={generate.isPending}
          className="btn-pill-primary w-full mt-6"
        >
          {generate.isPending ? '🔊 Speaking…' : `🔊 Speak it — ${COST}★`}
        </button>
      </div>
    </div>
  );
}
