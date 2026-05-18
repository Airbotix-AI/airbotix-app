import { useState } from 'react';

import { api } from '@/lib/api';
import { Celebration } from './shared/Celebration';
import { StudioChrome } from './shared/StudioChrome';
import { SessionSummary } from './shared/SessionSummary';
import { StudioTip } from './shared/StudioTip';
import { useExitSummary, useStudioSession } from './shared/useSession';
import { friendlyError, useGenerate, useRecentArtifacts, type Artifact } from './shared/useStudio';

const STYLES = ['cartoon', 'painting', 'pixel-art', 'photo', 'sketch', 'watercolor'] as const;
const SIZES = [
  { id: 'square', label: 'Square', dims: '512×512' },
  { id: 'wide', label: 'Wide', dims: '768×432' },
  { id: 'tall', label: 'Tall', dims: '432×768' },
] as const;

const COST = 4;

export function ImageMakerPage() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState<typeof STYLES[number]>('cartoon');
  const [size, setSize] = useState<typeof SIZES[number]['id']>('square');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const { sessionId } = useStudioSession('image');
  const { summary, endNow, dismiss } = useExitSummary();

  const generate = useGenerate('image');
  const recent = useRecentArtifacts('image');

  const onMake = () => {
    if (!prompt.trim()) {
      setError('Type what you want to draw first.');
      return;
    }
    setError(null);
    const fullPrompt = `${prompt.trim()}, ${style} style`;
    generate.mutate(
      { prompt: fullPrompt, options: { size } },
      {
        onError: (e) => setError(friendlyError(e)),
      },
    );
  };

  return (
    <StudioChrome
      eyebrow="Image Maker"
      eyebrowColor="eyebrow-bubblegum"
      emoji="🎨"
      title="Image Maker"
      subtitle="Describe what you want to see. The AI draws it. Best prompts say WHO, WHERE, and FEELING."
      cost={COST}
    >
      <Celebration show={showCelebrate} message="Your image is ready!" onDone={() => setShowCelebrate(false)} />
      <StudioTip
        color="bubblegum"
        tipTitle="Prompt secret: WHO + WHERE + FEELING"
        tipBody={"Best AI images come from describing a character, a place, and a mood. The more vivid, the better. AI doesn't read minds!"}
        examples={[
          { text: 'A friendly robot watering plants in space', hint: 'character + place' },
          { text: 'A cozy library with a sleeping cat, warm lamp light', hint: 'place + mood' },
          { text: 'A dragon flying over a glowing city at night', hint: 'classic dragon scene' },
          { text: 'A pixel-art knight saving a vegetable kingdom', hint: 'silly story prompt' },
          { text: 'Underwater jellyfish disco party', hint: 'fantasy + mood' }
        ]}
        onPick={(t) => setPrompt(t)}
      />

      <div className="card-base mb-6">
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
          <div className="flex flex-wrap gap-2">
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
          <div className="flex gap-2">
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
          {generate.isPending ? '✨ Making…' : `✨ Make it! −${COST}★`}
        </button>
      </div>

      <h2 className="text-[18px] font-bold text-ink mb-3">Your recent images</h2>
      {recent.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : (recent.data?.length ?? 0) === 0 ? (
        <div className="card-base text-center">
          <span className="sticker-bubblegum">Empty canvas</span>
          <p className="lead-text mt-3" style={{ fontSize: '14px' }}>
            Type a prompt above and tap Make it!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {recent.data!.slice(0, 12).map((a) => (
            <ImageTile key={a.id} artifact={a} />
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

function ImageTile({ artifact }: { artifact: Artifact }) {
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
    <div className="card-base p-2">
      <div className="aspect-square rounded-xl bg-surface overflow-hidden">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : null}
      </div>
      {meta.prompt && (
        <div className="text-[11px] text-ink-soft mt-2 line-clamp-2 italic">"{meta.prompt}"</div>
      )}
    </div>
  );
}
