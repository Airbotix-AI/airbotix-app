import { useState } from 'react';

import { Celebration } from './shared/Celebration';
import { StudioChrome } from './shared/StudioChrome';
import { SessionSummary } from './shared/SessionSummary';
import { StudioTip } from './shared/StudioTip';
import { useStudioSession } from './shared/useSession';
import {
  friendlyError,
  useArtifactUrl,
  useBucketArtifacts,
  useCreateBucket,
  useGenerate,
  type Artifact,
} from './shared/useStudio';

const DURATIONS = [
  { id: 4, label: '4 seconds' },
  { id: 8, label: '8 seconds' },
  { id: 12, label: '12 seconds' },
] as const;

const VIBES = ['cinematic', 'cartoon', '3d-animated', 'stop-motion', 'doodle'] as const;

const COST = 60; // video-default (star-pricing-sot.md)

export function VideoStudioPage() {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState<typeof DURATIONS[number]['id']>(4);
  const [vibe, setVibe] = useState<typeof VIBES[number]>('cartoon');
  const [error, setError] = useState<string | null>(null);
  const [showCelebrate, setShowCelebrate] = useState(false);

  const { summary, endNow, dismiss } = useStudioSession('video');

  // Clips auto-save into the kid's My Videos bucket (learn-create-studio-save-prd §5).
  const bucket = useCreateBucket('video');
  const generate = useGenerate('video', bucket.data?.project_id);
  const recent = useBucketArtifacts(bucket.data?.project_id);

  const onMake = () => {
    if (!prompt.trim()) {
      setError('Describe the scene you want to film.');
      return;
    }
    setError(null);
    generate.mutate(
      { prompt: `${prompt.trim()}, ${vibe} style`, options: { duration } },
      { onSuccess: () => setShowCelebrate(true), onError: (e) => setError(friendlyError(e)) },
    );
  };

  return (
    <StudioChrome
      eyebrow="Video Studio"
      eyebrowColor="eyebrow-sunshine"
      emoji="🎬"
      title="Video Studio"
      subtitle="Short AI video from a prompt. Best for storytelling and animation practice."
      cost={COST}
    >
      <Celebration show={showCelebrate} message="Your video is ready!" onDone={() => setShowCelebrate(false)} />
      <StudioTip
        color="sunshine"
        tipTitle="Video = simple scene + camera direction"
        tipBody={"Videos work best with ONE clear scene. Add camera details: 'close-up', 'wide shot', 'spinning around'."}
        examples={[
          { text: 'A baby dinosaur learning to roar in a misty jungle', hint: 'character story' },
          { text: 'Close-up of a flower blooming, time-lapse', hint: 'time-lapse' },
          { text: 'A paper airplane flying through a colorful tunnel', hint: 'motion scene' },
          { text: 'Stop-motion clay robot dancing', hint: 'style mention' },
          { text: 'Wide shot of a candy-colored planet with rivers of jelly', hint: 'fantasy world' }
        ]}
        onPick={(t) => setPrompt(t)}
      />

      <div className="card-base mb-6">
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
          <div className="flex flex-wrap gap-2">
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
          <div className="flex gap-2">
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

        <button onClick={onMake} disabled={generate.isPending || !bucket.data} className="btn-pill-primary w-full mt-6">
          {generate.isPending ? '🎬 Filming…' : `🎬 Film it −${COST}★`}
        </button>
        <p className="text-[11px] text-slate2 mt-3">
          ⏱ Video takes 30-60s to generate. Hang tight.
        </p>
      </div>

      <h2 className="text-[18px] font-bold text-ink mb-1">Your recent videos</h2>
      <p className="text-[12px] text-ink-soft mb-3">
        Everything you make is saved to {bucket.data?.title ?? 'My Videos'} ✓
      </p>
      {recent.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : (recent.data?.length ?? 0) === 0 ? (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Roll the camera</span>
          <p className="lead-text mt-3" style={{ fontSize: '14px' }}>
            Tap Film to create your first AI video.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recent.data!.slice(0, 8).map((a) => (
            <VideoTile key={a.id} artifact={a} />
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

function VideoTile({ artifact }: { artifact: Artifact }) {
  const url = useArtifactUrl(artifact);
  const meta = artifact.metadata as { prompt?: string };
  return (
    <div className="card-base p-3">
      <div className="aspect-video rounded-xl bg-surface overflow-hidden">
        {url.data ? (
          <video controls className="h-full w-full object-cover">
            <source src={url.data} type={artifact.mime_type} />
          </video>
        ) : (
          <div className="h-full flex items-center justify-center">
            <span className="text-[12px] text-slate2">loading…</span>
          </div>
        )}
      </div>
      {meta.prompt && (
        <div className="text-[12px] text-ink-soft mt-2 line-clamp-2 italic">"{meta.prompt}"</div>
      )}
    </div>
  );
}
