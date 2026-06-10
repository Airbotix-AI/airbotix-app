// Kind-aware preview for one asset (design §5). The preview region swaps by
// kind; metadata / code-ref / manage live in AssetViewerPane around it.
//   - image  → multi-background stage (checker / dark / white / green)
//   - sprite → same, plus a frame animation player (from the .anim.json sidecar)
//   - audio  → wavesurfer.js waveform + play/pause (existing dep, no DOM hack)
//   - video  → inline <video> player
// Backgrounds use inline styles (a QA tool surface, not themeable chrome), so no
// raw hex leaks into Tailwind classes.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';

import clsx from 'clsx';
import { Pause, Play, SkipForward } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

import type { VfsFile } from '../../code/codeApi';
import { animSidecarPath, assetKindOf, dataUrlToText, parseAnimSidecar, type AnimMeta } from './assetMeta';

interface AssetPreviewProps {
  asset: VfsFile;
  files: VfsFile[];
}

type PreviewBg = 'checker' | 'dark' | 'white' | 'green';

const BG_OPTIONS: ReadonlyArray<{ id: PreviewBg; label: string }> = [
  { id: 'checker', label: 'Checker' },
  { id: 'dark', label: 'Dark' },
  { id: 'white', label: 'White' },
  { id: 'green', label: 'Green' },
];

const CHECKER_STYLE: CSSProperties = {
  backgroundImage: 'repeating-conic-gradient(#9aa0ac 0% 25%, #cfd3db 0% 50%)',
  backgroundSize: '20px 20px',
};

function bgStyle(bg: PreviewBg): CSSProperties {
  switch (bg) {
    case 'checker':
      return CHECKER_STYLE;
    case 'dark':
      return { backgroundColor: '#0f0b18' };
    case 'white':
      return { backgroundColor: '#ffffff' };
    case 'green':
      return { backgroundColor: '#00b140' };
    default:
      return {};
  }
}

/** A sprite strip clipped to one frame, stepping at the sidecar's fps. */
function SpriteStage({ dataUrl, anim }: { dataUrl: string; anim: AnimMeta }) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return undefined;
    const interval = window.setInterval(
      () => setFrame((f) => (f + 1) % anim.frames),
      1000 / anim.fps,
    );
    return () => window.clearInterval(interval);
  }, [playing, anim.frames, anim.fps]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        style={{
          width: anim.frameWidth,
          height: anim.frameHeight,
          backgroundImage: `url(${dataUrl})`,
          backgroundPosition: `-${frame * anim.frameWidth}px 0`,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
        }}
      />
      <div className="flex items-center gap-2 text-pg-text-dim">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-bubblegum text-white"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setFrame((f) => (f + 1) % anim.frames);
          }}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-pg-border"
          aria-label="Step frame"
        >
          <SkipForward size={16} />
        </button>
        <span className="text-[12px] font-semibold">
          frame {frame + 1} / {anim.frames} · {anim.fps} fps
        </span>
      </div>
    </div>
  );
}

function AudioStage({ dataUrl }: { dataUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: dataUrl,
      height: 96,
      waveColor: '#5a5470',
      progressColor: '#ff6ba9',
      cursorColor: '#ffffff',
    });
    ws.on('play', () => setPlaying(true));
    ws.on('pause', () => setPlaying(false));
    ws.on('finish', () => setPlaying(false));
    wsRef.current = ws;
    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [dataUrl]);

  return (
    <div className="flex w-full flex-col gap-3">
      <div ref={containerRef} className="w-full rounded-xl bg-pg-surface-2 p-3" />
      <button
        type="button"
        onClick={() => void wsRef.current?.playPause()}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-bubblegum px-4 py-2 text-[13px] font-extrabold text-white"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
        {playing ? 'Pause' : 'Play'}
      </button>
    </div>
  );
}

export function AssetPreview({ asset, files }: AssetPreviewProps) {
  const [bg, setBg] = useState<PreviewBg>('checker');
  const kind = assetKindOf(asset.path, files);
  const anim = useMemo(
    () =>
      kind === 'sprite'
        ? parseAnimSidecar(files.find((f) => f.path === animSidecarPath(asset.path)))
        : null,
    [kind, files, asset.path],
  );

  if (kind === 'audio') {
    return <AudioStage dataUrl={asset.content} />;
  }

  if (kind === 'video') {
    return (
      <video
        src={asset.content}
        controls
        className="max-h-[420px] w-full rounded-xl bg-black"
      />
    );
  }

  if (kind === 'text') {
    return (
      <pre className="max-h-[420px] w-full overflow-auto whitespace-pre-wrap break-words rounded-xl border border-pg-border bg-pg-surface-2 p-3 font-mono text-[12.5px] text-pg-text">
        {dataUrlToText(asset.content)}
      </pre>
    );
  }

  // image / sprite / other → a background-toggleable stage
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {BG_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setBg(id)}
            className={clsx(
              'rounded-lg border px-2.5 py-1 text-[12px] font-bold transition-colors',
              bg === id
                ? 'border-brand-bubblegum/60 bg-brand-bubblegum/15 text-pg-text'
                : 'border-pg-border text-pg-text-dim hover:text-pg-text',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        style={bgStyle(bg)}
        className="flex min-h-[260px] items-center justify-center overflow-auto rounded-xl p-6"
      >
        {anim ? (
          <SpriteStage dataUrl={asset.content} anim={anim} />
        ) : (
          <img
            src={asset.content}
            alt={asset.path}
            className="max-h-[360px] max-w-full object-contain"
          />
        )}
      </div>
    </div>
  );
}
