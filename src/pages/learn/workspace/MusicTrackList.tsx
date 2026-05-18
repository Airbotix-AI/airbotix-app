// Music-studio preview pane redesigned as a mini DAW:
//   ▸ dark stage (slate-950) with brand-coral accents
//   ▸ transport bar: ⏮ rewind · ▶ play all · ⏹ stop · time display · master volume
//   ▸ channel strip per track: number, label, color dot, Mute / Solo, volume slider
//   ▸ waveform area with shared visual timeline
//   ▸ "+ Add track" CTA at the bottom (delegates to parent to open the studio picker)
//
// Sync mixing across tracks is still V0-sequential — see TODO at the bottom.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import WaveSurfer from 'wavesurfer.js';

import { api } from '@/lib/api';
import type { Message } from './WorkspacePage';

// Each track gets a distinct accent color cycled from the brand palette.
const TRACK_COLORS = [
  { name: 'coral',     hex: '#ef5b3d', soft: '#ffb3a7' },
  { name: 'bubblegum', hex: '#ff5fa8', soft: '#ffb8d4' },
  { name: 'sky',       hex: '#4c8df8', soft: '#aac8fa' },
  { name: 'mint',      hex: '#2dc28d', soft: '#9ee5cb' },
  { name: 'sunshine',  hex: '#f5b524', soft: '#ffe0a0' },
];

export interface TrackPair {
  id: string;            // assistant message id
  promptLabel: string;   // friendly label derived from user prompt
  message: Message;      // the assistant message (with artifact)
}

export function MusicTrackList({
  messages,
  onGenerateTrack,
  onImportTrack,
  onUploadTrack,
}: {
  messages: Message[];
  onGenerateTrack?: () => void;
  onImportTrack?: () => void;
  onUploadTrack?: () => void;
}) {
  const tracks = useMemo<TrackPair[]>(() => {
    // Walk messages, pair each audio assistant with its preceding user prompt.
    const out: TrackPair[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === 'assistant' && m.artifact && m.artifact.kind === 'audio') {
        const prev = messages[i - 1];
        const label = prev && prev.role === 'user' ? stripPrefix(prev.content) : `Track`;
        out.push({ id: m.id, promptLabel: label, message: m });
      }
    }
    return out;
  }, [messages]);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [masterPlaying, setMasterPlaying] = useState(false);
  const [soloId, setSoloId] = useState<string | null>(null);
  const [mutedIds, setMutedIds] = useState<Record<string, boolean>>({});
  const [masterVolume, setMasterVolume] = useState(0.85);
  const [playhead, setPlayhead] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  const wsRefs = useRef<Record<string, WaveSurfer | null>>({});
  const trackDurationsRef = useRef<Record<string, number>>({});

  const effectiveMuted = (id: string): boolean => {
    if (soloId && soloId !== id) return true;
    return !!mutedIds[id];
  };

  // Push muted state into each wavesurfer instance.
  useEffect(() => {
    for (const t of tracks) {
      const ws = wsRefs.current[t.id];
      if (ws) ws.setMuted(effectiveMuted(t.id));
    }
  }, [tracks, soloId, mutedIds]);

  // Push master volume.
  useEffect(() => {
    for (const id of Object.keys(wsRefs.current)) {
      const ws = wsRefs.current[id];
      if (ws) ws.setVolume(masterVolume);
    }
  }, [masterVolume]);

  const rewind = () => {
    for (const id of Object.keys(wsRefs.current)) {
      const ws = wsRefs.current[id];
      if (ws) ws.setTime(0);
    }
    setPlayhead(0);
  };

  const stopAll = () => {
    for (const id of Object.keys(wsRefs.current)) {
      const ws = wsRefs.current[id];
      if (ws) ws.pause();
    }
    setPlayingId(null);
    setMasterPlaying(false);
  };

  const togglePlayOne = (trackId: string) => {
    const ws = wsRefs.current[trackId];
    if (!ws) return;
    if (playingId === trackId) {
      ws.pause();
      setPlayingId(null);
    } else {
      if (playingId && wsRefs.current[playingId]) wsRefs.current[playingId]!.pause();
      ws.play();
      setPlayingId(trackId);
    }
  };

  const playAllSequential = async () => {
    setMasterPlaying(true);
    for (const t of tracks) {
      if (effectiveMuted(t.id)) continue;
      const ws = wsRefs.current[t.id];
      if (!ws) continue;
      setPlayingId(t.id);
      ws.setTime(0);
      await new Promise<void>((resolve) => {
        const onFinish = () => {
          ws.un('finish', onFinish);
          resolve();
        };
        ws.on('finish', onFinish);
        ws.play();
      });
    }
    setPlayingId(null);
    setMasterPlaying(false);
  };

  const reportDuration = (id: string, d: number) => {
    trackDurationsRef.current[id] = d;
    setMaxDuration(Math.max(...Object.values(trackDurationsRef.current), 0));
  };

  return (
    <aside className="hidden lg:flex w-[560px] shrink-0 flex-col bg-slate-950 text-slate-100 border-l border-slate-800">
      {/* ─── Transport bar ─── */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-bold">
              🎛 Music Studio
            </div>
            <div className="text-[14px] font-bold text-slate-100 mt-0.5">
              Your mix · {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
            </div>
          </div>
          <div className="font-mono text-[18px] tabular-nums text-slate-100">
            {fmtTime(playhead)} <span className="text-slate-500">/ {fmtTime(maxDuration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <IconBtn label="Rewind" onClick={rewind}>⏮</IconBtn>
          {masterPlaying ? (
            <IconBtn label="Stop" onClick={stopAll} primary>⏹</IconBtn>
          ) : (
            <IconBtn label="Play all" onClick={playAllSequential} primary disabled={tracks.length === 0}>
              ▶
            </IconBtn>
          )}
          <div className="ml-3 flex items-center gap-2 flex-1">
            <span className="text-[11px] text-slate-400 font-semibold">MASTER</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={(e) => setMasterVolume(Number(e.target.value))}
              className="flex-1 accent-brand-coral"
            />
            <span className="font-mono text-[11px] text-slate-300 w-8 text-right">
              {Math.round(masterVolume * 100)}
            </span>
          </div>
        </div>
      </div>

      {/* ─── Tracks ─── */}
      <div className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <EmptyState onAddTrack={onGenerateTrack} />
        ) : (
          <div>
            {tracks.map((t, i) => (
              <ChannelStrip
                key={t.id}
                track={t}
                index={i}
                color={TRACK_COLORS[i % TRACK_COLORS.length]}
                registerWs={(ws) => {
                  wsRefs.current[t.id] = ws;
                  if (ws) ws.setVolume(masterVolume);
                }}
                isPlaying={playingId === t.id}
                isMuted={!!mutedIds[t.id]}
                isSolo={soloId === t.id}
                effectivelyMuted={effectiveMuted(t.id)}
                onTogglePlay={() => togglePlayOne(t.id)}
                onToggleMute={() =>
                  setMutedIds((m) => ({ ...m, [t.id]: !m[t.id] }))
                }
                onToggleSolo={() => setSoloId((s) => (s === t.id ? null : t.id))}
                onTime={(time) => {
                  if (playingId === t.id) setPlayhead(time);
                }}
                onDuration={(d) => reportDuration(t.id, d)}
              />
            ))}

            <div className="m-3 grid grid-cols-3 gap-2">
              {onGenerateTrack && (
                <AddTrackAction
                  icon="🎵"
                  title="Generate"
                  hint="Make a new layer with AI"
                  onClick={onGenerateTrack}
                />
              )}
              {onImportTrack && (
                <AddTrackAction
                  icon="📂"
                  title="Import"
                  hint="From your other chats"
                  onClick={onImportTrack}
                />
              )}
              {onUploadTrack && (
                <AddTrackAction
                  icon="⬆"
                  title="Upload"
                  hint="Your own audio file"
                  onClick={onUploadTrack}
                />
              )}
            </div>
            <p className="text-[11px] text-slate-500 text-center px-4 pb-3 leading-relaxed">
              Tip: same style + mood across tracks layer best. Try different instruments per track.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function EmptyState({ onAddTrack }: { onAddTrack?: () => void }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-[48px] opacity-50">🎵</div>
      <p className="text-[13px] text-slate-400 mt-3 leading-relaxed">
        Describe a song below — each one becomes a track here so you can layer them like a real producer.
      </p>
      {onAddTrack && (
        <button
          onClick={onAddTrack}
          className="mt-4 rounded-full bg-brand-coral text-white px-4 py-2 text-[12px] font-bold"
        >
          + Add first track
        </button>
      )}
    </div>
  );
}

function ChannelStrip({
  track,
  index,
  color,
  registerWs,
  isPlaying,
  isMuted,
  isSolo,
  effectivelyMuted,
  onTogglePlay,
  onToggleMute,
  onToggleSolo,
  onTime,
  onDuration,
}: {
  track: TrackPair;
  index: number;
  color: (typeof TRACK_COLORS)[number];
  registerWs: (ws: WaveSurfer | null) => void;
  isPlaying: boolean;
  isMuted: boolean;
  isSolo: boolean;
  effectivelyMuted: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onTime: (s: number) => void;
  onDuration: (s: number) => void;
}) {
  const artifact = track.message.artifact!;
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.85);

  const dl = useQuery<{ url: string }>({
    queryKey: ['artifact', artifact.id, 'download'],
    queryFn: () =>
      api<{ url: string }>(
        `/projects/${artifact.project_id}/artifacts/${artifact.id}/download-url`,
        { method: 'POST' },
      ),
    staleTime: 4 * 60_000,
  });

  useEffect(() => {
    if (!dl.data?.url || !containerRef.current) return;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url: dl.data.url,
      waveColor: color.soft,
      progressColor: color.hex,
      cursorColor: '#f1f5f9',
      cursorWidth: 1,
      height: 40,
      barWidth: 2,
      barGap: 1,
      barRadius: 1.5,
      normalize: true,
      backend: 'WebAudio',
    });
    wsRef.current = ws;
    registerWs(ws);
    ws.on('ready', () => {
      const d = ws.getDuration();
      setDuration(d);
      onDuration(d);
    });
    ws.on('timeupdate', (t) => {
      setProgress(t);
      onTime(t);
    });
    ws.on('finish', () => setProgress(0));
    return () => {
      registerWs(null);
      ws.destroy();
      wsRef.current = null;
    };
  }, [dl.data?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wsRef.current) wsRef.current.setVolume(effectivelyMuted ? 0 : volume);
  }, [volume, effectivelyMuted]);

  return (
    <div className="flex border-b border-slate-800 hover:bg-slate-900/50 transition-colors">
      {/* Channel strip (left) */}
      <div className="w-44 shrink-0 p-3 border-r border-slate-800 bg-slate-900/30">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color.hex }}
          />
          <div className="text-[10px] font-bold tracking-[0.10em] text-slate-400">
            TRACK {index + 1}
          </div>
        </div>
        <div className="text-[12px] font-semibold text-slate-100 leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
          {track.promptLabel}
        </div>

        <div className="flex items-center gap-1 mb-2">
          <button
            onClick={onTogglePlay}
            className="rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 w-7 h-7 text-[12px] font-bold inline-flex items-center justify-center"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            onClick={onToggleMute}
            className={
              isMuted
                ? 'rounded-md bg-brand-coral text-white w-7 h-7 text-[10px] font-bold inline-flex items-center justify-center'
                : 'rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 text-[10px] font-bold inline-flex items-center justify-center'
            }
            title="Mute"
          >
            M
          </button>
          <button
            onClick={onToggleSolo}
            className={
              isSolo
                ? 'rounded-md bg-brand-sunshine text-ink w-7 h-7 text-[10px] font-bold inline-flex items-center justify-center'
                : 'rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 w-7 h-7 text-[10px] font-bold inline-flex items-center justify-center'
            }
            title="Solo"
          >
            S
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-bold">VOL</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="flex-1 accent-brand-coral"
          />
        </div>
      </div>

      {/* Waveform area (right) */}
      <div className="flex-1 min-w-0 p-3 relative">
        <div ref={containerRef} className={effectivelyMuted ? 'opacity-30' : 'opacity-100'} />
        <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>{fmtTime(progress)}</span>
          <a
            href={dl.data?.url}
            download
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            ↓ Download
          </a>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

function AddTrackAction({
  icon,
  title,
  hint,
  onClick,
}: {
  icon: string;
  title: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-dashed border-slate-700 hover:border-brand-coral hover:bg-slate-900 px-3 py-3 text-left transition-colors"
    >
      <div className="text-[18px] mb-1">{icon}</div>
      <div className="text-[12px] font-bold text-slate-100">{title}</div>
      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{hint}</div>
    </button>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  primary,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? 'rounded-full bg-brand-coral hover:brightness-110 disabled:opacity-40 text-white w-10 h-10 inline-flex items-center justify-center text-[16px] font-bold shadow-lg shadow-brand-coral/30'
          : 'rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 w-10 h-10 inline-flex items-center justify-center text-[14px]'
      }
    >
      {children}
    </button>
  );
}

// Strip the auto-prepended structured prefix `[key: v · key2: v2] real prompt`
function stripPrefix(content: string): string {
  const m = content.match(/^\[[^\]]+\]\s*(.*)$/);
  return (m ? m[1] : content).trim() || 'Untitled track';
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// TODO V1: replace sequential playAll with synced playback using Tone.js
//   const ctx = new Tone.Context(); for each track create a Tone.Player connected to ctx.destination;
//   call Tone.start() on first user gesture; schedule .start(0) on a common transport tick.
//   Drop wavesurfer's internal playback; keep it for waveform render only.
