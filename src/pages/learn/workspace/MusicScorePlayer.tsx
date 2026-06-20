import { useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';

import { ChannelStrip } from './ChannelStrip';
import { VersionBar } from './VersionBar';

export interface ScoreNote {
  time: number;
  note: string;
  duration: string;
  lyric?: string;
}
export interface ScoreTrack {
  instrument:
    | 'lead_vocals' | 'backing_vocals' | 'drums' | 'bass' | 'guitar' | 'keyboard'
    | 'percussion' | 'synth' | 'strings' | 'piano' | 'brass' | 'pad' | 'flute' | 'other';
  role?: 'lead' | 'rhythm' | 'harmony' | 'percussion' | 'fx';
  notes: ScoreNote[];
}
export interface MusicScore {
  title: string;
  tempo: number;
  key: string;
  genre?: string;
  tracks: ScoreTrack[];
}

export interface InstrumentMeta {
  emoji: string;
  color: { hex: string; soft: string };
  label: string;
}

export const INSTRUMENT_META: Record<ScoreTrack['instrument'], InstrumentMeta> = {
  lead_vocals:    { emoji: '🎤', color: { hex: '#ef5b3d', soft: '#ffb3a7' }, label: 'Lead Vocals'    },
  backing_vocals: { emoji: '🎵', color: { hex: '#ff5fa8', soft: '#ffb8d4' }, label: 'Backing Vocals' },
  drums:          { emoji: '🥁', color: { hex: '#2dc28d', soft: '#9ee5cb' }, label: 'Drums'          },
  bass:           { emoji: '🎸', color: { hex: '#4c8df8', soft: '#aac8fa' }, label: 'Bass'           },
  guitar:         { emoji: '🎸', color: { hex: '#f5b524', soft: '#ffe0a0' }, label: 'Guitar'         },
  keyboard:       { emoji: '🎹', color: { hex: '#ef5b3d', soft: '#ffb3a7' }, label: 'Keyboard'       },
  percussion:     { emoji: '🪘', color: { hex: '#2dc28d', soft: '#9ee5cb' }, label: 'Percussion'     },
  synth:          { emoji: '🎚', color: { hex: '#9d6bff', soft: '#d6c2ff' }, label: 'Synth'          },
  strings:        { emoji: '🎻', color: { hex: '#f5b524', soft: '#ffe0a0' }, label: 'Strings'        },
  piano:          { emoji: '🎹', color: { hex: '#ef5b3d', soft: '#ffb3a7' }, label: 'Piano'          },
  brass:          { emoji: '🎺', color: { hex: '#ff5fa8', soft: '#ffb8d4' }, label: 'Brass'          },
  pad:            { emoji: '🌊', color: { hex: '#67d4ff', soft: '#bdeaff' }, label: 'Pad'            },
  flute:          { emoji: '🪈', color: { hex: '#67d4ff', soft: '#bdeaff' }, label: 'Flute'          },
  other:          { emoji: '🎶', color: { hex: '#9d6bff', soft: '#d6c2ff' }, label: 'Other'          },
};

export function MusicScorePlayer({
  score,
  scoreVersions = [],
  activeVersionIdx = 0,
  onSelectVersion,
  onAddTrack,
  onImportTrack,
  onReroll,
  onDownloadTrack,
  onSaveTrack,
  onDownloadMix,
  onSaveMix,
  savingState,
}: {
  score: MusicScore;
  scoreVersions?: MusicScore[];
  activeVersionIdx?: number;
  onSelectVersion?: (i: number) => void;
  onAddTrack?: () => void;
  onImportTrack?: () => void;
  onReroll?: (idx: number) => void;
  onDownloadTrack?: (idx: number) => void;
  onSaveTrack?: (idx: number) => void;
  onDownloadMix?: () => void;
  onSaveMix?: () => void;
  savingState?: Record<string, boolean>;

}) {
  type SynthVoice =
    | Tone.PolySynth
    | Tone.MembraneSynth
    | Tone.MonoSynth
    | Tone.PluckSynth
    | Tone.MetalSynth;

  const synthsRef = useRef<Record<number, SynthVoice>>({});
  const channelsRef = useRef<Record<number, Tone.Channel>>({});
  const partsRef = useRef<Tone.Part[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [muted, setMuted] = useState<Record<number, boolean>>({});
  const [soloIdx, setSoloIdx] = useState<number | null>(null);
  const [volumes, setVolumes] = useState<Record<number, number>>({});
  const [deletedIndices, setDeletedIndices] = useState<Set<number>>(new Set());
  const [isSavingMix, setIsSavingMix] = useState(false);
  const [savedMix, setSavedMix] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalDuration = useMemo(() => {
    if (!score) return 0;
    let maxBeat = 0;
    for (const t of score.tracks) {
      for (const n of t.notes) {
        const end = n.time + parseDurationBeats(n.duration);
        if (end > maxBeat) maxBeat = end;
      }
    }
    return (maxBeat * 60) / score.tempo;
  }, [score]);

  useEffect(() => {
    setDeletedIndices(new Set());
  }, [score]);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isFullscreen]);

  useEffect(() => {
    Tone.getTransport().bpm.value = score.tempo;

    for (const part of partsRef.current) part.dispose();
    partsRef.current = [];
    for (const k of Object.keys(synthsRef.current)) {
      (synthsRef.current[Number(k)] as { dispose: () => void }).dispose();
    }
    for (const k of Object.keys(channelsRef.current)) channelsRef.current[Number(k)].dispose();
    synthsRef.current = {};
    channelsRef.current = {};

    score.tracks.forEach((t, idx) => {
      const channel = new Tone.Channel({ volume: 0, pan: 0 }).toDestination();
      channelsRef.current[idx] = channel;
      const synth = makeSynthFor(t.instrument);
      synth.connect(channel);
      synthsRef.current[idx] = synth;

      const isDrum = t.instrument === 'drums' || t.instrument === 'percussion';
      if (isDrum) {
        const part = new Tone.Part(
          (time, value) => {
            const v = value as { drum: string; duration: string };
            triggerDrum(synth, v.drum, time);
          },
          t.notes.map((n) => ({ time: n.time * (60 / score.tempo), drum: n.note, duration: n.duration })),
        );
        part.start(0);
        partsRef.current.push(part);
      } else {
        const part = new Tone.Part(
          (time, value) => {
            const v = value as { note: string; duration: string };
            (synth as Tone.PolySynth).triggerAttackRelease(v.note, v.duration, time);
          },
          t.notes.map((n) => ({ time: n.time * (60 / score.tempo), note: n.note, duration: n.duration })),
        );
        part.start(0);
        partsRef.current.push(part);
      }
    });

    return () => {
      for (const part of partsRef.current) part.dispose();
      partsRef.current = [];
      for (const k of Object.keys(synthsRef.current)) {
        (synthsRef.current[Number(k)] as { dispose: () => void }).dispose();
      }
      for (const k of Object.keys(channelsRef.current)) channelsRef.current[Number(k)].dispose();
      synthsRef.current = {};
      channelsRef.current = {};
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
    };
  }, [score]);

  useEffect(() => {
    score.tracks.forEach((_, idx) => {
      const ch = channelsRef.current[idx];
      if (!ch) return;
      ch.mute = deletedIndices.has(idx) || !!muted[idx] || (soloIdx !== null && soloIdx !== idx);
    });
  }, [muted, soloIdx, deletedIndices, score]);

  useEffect(() => {
    score.tracks.forEach((_, idx) => {
      const ch = channelsRef.current[idx];
      if (!ch) return;
      ch.volume.value = Tone.gainToDb(volumes[idx] ?? 0.85);
    });
  }, [volumes, score.tracks]);

  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const t = Tone.getTransport().seconds;
      setPosition(t);
      if (t >= totalDuration) {
        Tone.getTransport().stop();
        Tone.getTransport().position = 0;
        setPosition(0);
        setIsPlaying(false);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [isPlaying, totalDuration]);

  const play = async () => {
    await Tone.start();
    Tone.getTransport().start();
    setIsPlaying(true);
  };
  const stop = () => {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    setPosition(0);
    setIsPlaying(false);
  };

  const handleDownloadMix = async () => {
    if (onDownloadMix) { onDownloadMix(); return; }
    await renderAndDownload(score, muted, null);
  };

  const handleSaveMix = async () => {
    if (onSaveMix) {
      setIsSavingMix(true);
      try {
        await onSaveMix();
        setSavedMix(true);
        setTimeout(() => setSavedMix(false), 3000);
      } finally {
        setIsSavingMix(false);
      }
    }
  };

  const handleDownloadTrack = async (idx: number) => {
    if (onDownloadTrack) { onDownloadTrack(idx); return; }
    await renderAndDownload(score, muted, idx);
  };

  const seekFrac = totalDuration > 0 ? Math.min(1, position / totalDuration) : 0;

  return (
    <aside className={
      isFullscreen
        ? 'fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100'
        : 'hidden lg:flex w-[580px] shrink-0 flex-col bg-slate-950 text-slate-100 border-l border-slate-800'
    }>
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-bold">
              🎛 Music Studio · MIDI
            </div>
            <div className="text-[14px] font-bold text-slate-100 mt-0.5 truncate">{score.title}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {score.tempo} BPM · {score.key}{score.genre ? ` · ${score.genre}` : ''} · {score.tracks.length - deletedIndices.size} track{score.tracks.length - deletedIndices.size !== 1 ? 's' : ''}
            </div>
            {scoreVersions.length >= 2 && onSelectVersion && (
              <div className="mt-1.5">
                <VersionBar
                  scoreVersions={scoreVersions}
                  activeVersionIdx={activeVersionIdx}
                  onSelectVersion={onSelectVersion}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <div className="font-mono text-[18px] tabular-nums text-slate-100">
              {fmtTime(position)} <span className="text-slate-500">/ {fmtTime(totalDuration)}</span>
            </div>
            <button
              onClick={() => setIsFullscreen((v) => !v)}
              className="rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 w-7 h-7 inline-flex items-center justify-center transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M5 1H1v4M9 1h4v4M5 13H1V9M9 13h4V9"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {isPlaying ? (
            <TransportBtn primary onClick={stop} label="Stop">⏹</TransportBtn>
          ) : (
            <TransportBtn primary onClick={play} label="Play">▶</TransportBtn>
          )}
          <TransportBtn onClick={stop} label="Rewind">⏮</TransportBtn>
          <div className="ml-1 flex-1 min-w-[60px] h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-coral to-brand-bubblegum transition-[width] ease-linear"
              style={{ width: `${seekFrac * 100}%` }}
            />
          </div>
          <button
            onClick={handleDownloadMix}
            className="rounded-full bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1.5 text-[10px] font-semibold shrink-0"
            title="Download mix as WAV"
          >
            ↓ WAV
          </button>
          {onSaveMix && (
            <button
              onClick={handleSaveMix}
              disabled={isSavingMix}
              className="rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 px-2.5 py-1.5 text-[10px] font-semibold shrink-0"
              title="Save to My Works"
            >
              {savedMix ? '✅ Saved' : isSavingMix ? '…' : '💾 Save'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {score.tracks.map((t, idx) => {
          if (deletedIndices.has(idx)) return null;
          return (
            <ChannelStrip
              key={idx}
              index={idx}
              track={t}
              meta={INSTRUMENT_META[t.instrument] ?? INSTRUMENT_META['other']}
              position={position}
              totalDuration={totalDuration}
              isMuted={!!muted[idx]}
              isSolo={soloIdx === idx}
              volume={volumes[idx] ?? 0.85}
              tempo={score.tempo}
              onToggleMute={() => setMuted((m) => ({ ...m, [idx]: !m[idx] }))}
              onToggleSolo={() => setSoloIdx((s) => (s === idx ? null : idx))}
              onVolume={(v) => setVolumes((m) => ({ ...m, [idx]: v }))}
              onReroll={onReroll}
              onDownloadTrack={handleDownloadTrack}
              onSaveTrack={onSaveTrack}
              onDeleteTrack={(i) => setDeletedIndices((prev) => new Set([...prev, i]))}
              savingState={savingState}
            />
          );
        })}

        {(onAddTrack || onImportTrack) && (
          <div className="m-3 grid grid-cols-2 gap-2">
            {onAddTrack && (
              <ActionCard icon="🎵" title="Generate" hint="New AI layer" onClick={onAddTrack} />
            )}
            {onImportTrack && (
              <ActionCard icon="📂" title="Import" hint="From other chats" onClick={onImportTrack} />
            )}
          </div>
        )}
        <p className="text-[11px] text-slate-500 text-center px-4 pb-3 leading-relaxed">
          All tracks play synced via Tone.js Transport. Solo/Mute per channel.
        </p>
      </div>
    </aside>
  );
}

function ActionCard({
  icon, title, hint, onClick,
}: {
  icon: string; title: string; hint: string; onClick: () => void;
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

function TransportBtn({
  children, label, onClick, primary, disabled,
}: {
  children: React.ReactNode; label: string; onClick: () => void; primary?: boolean; disabled?: boolean;
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

// ── Synth factory ───────────────────────────────────────────────────────────

export function makeSynthFor(instrument: ScoreTrack['instrument']) {
  switch (instrument) {
    case 'piano':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.005, decay: 0.3, sustain: 0.2, release: 1 },
      });
    case 'guitar':
      return new Tone.PluckSynth({ attackNoise: 1, dampening: 4000, resonance: 0.9 });
    case 'bass':
      return new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.6 },
        filter: { Q: 2, type: 'lowpass', rolloff: -24 },
      });
    case 'strings':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.6, decay: 0.2, sustain: 0.8, release: 1.5 },
      });
    case 'synth':
      return new Tone.PolySynth(Tone.FMSynth);
    case 'flute':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.15, decay: 0.1, sustain: 0.6, release: 0.8 },
      });
    case 'drums':
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.4 },
      });
    case 'lead_vocals':
      return new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 1,
        detune: 0,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.5 },
      });
    case 'backing_vocals':
      return new Tone.PolySynth(Tone.AMSynth, {
        harmonicity: 2,
        detune: 0,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.5 },
      });
    case 'keyboard':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
      });
    case 'percussion':
      return new Tone.MetalSynth({
        envelope: { attack: 0.001, decay: 0.1, release: 0.1 },
        harmonicity: 5.1,
        modulationIndex: 32,
        resonance: 4000,
        octaves: 1.5,
      });
    case 'brass':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'square' },
        envelope: { attack: 0.05, decay: 0.1, sustain: 0.6, release: 0.4 },
      });
    case 'pad':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.8, decay: 0.3, sustain: 0.9, release: 2.0 },
      });
    case 'other':
    default:
      return new Tone.PolySynth(Tone.Synth);
  }
}

function triggerDrum(synth: unknown, drum: string, time: number) {
  if (drum === 'kick') {
    // @ts-expect-error triggerAttackRelease on MembraneSynth/MetalSynth
    synth.triggerAttackRelease('C1', '8n', time);
  } else if (drum === 'snare' || drum === 'clap') {
    // @ts-expect-error triggerAttackRelease on MembraneSynth/MetalSynth
    synth.triggerAttackRelease('A1', '16n', time);
  } else if (drum === 'tom') {
    // @ts-expect-error triggerAttackRelease on MembraneSynth
    synth.triggerAttackRelease('E1', '8n', time);
  } else {
    // hat, ride
    // @ts-expect-error triggerAttackRelease on MembraneSynth/MetalSynth
    synth.triggerAttackRelease('A4', '32n', time, 0.3);
  }
}

// ── WAV export ──────────────────────────────────────────────────────────────

async function renderAndDownload(
  score: MusicScore,
  muted: Record<number, boolean>,
  singleTrackIdx: number | null,
) {
  const duration = (() => {
    let maxBeat = 0;
    for (const t of score.tracks) {
      for (const n of t.notes) {
        const end = n.time + parseDurationBeats(n.duration);
        if (end > maxBeat) maxBeat = end;
      }
    }
    return (maxBeat * 60) / score.tempo;
  })();

  if (duration <= 0) return;

  const audioBuffer = await Tone.Offline(({ transport }) => {
    transport.bpm.value = score.tempo;
    score.tracks.forEach((t, idx) => {
      if (singleTrackIdx !== null && idx !== singleTrackIdx) return;
      if (singleTrackIdx === null && muted[idx]) return;
      const synth = makeSynthFor(t.instrument);
      synth.toDestination();
      const isDrum = t.instrument === 'drums' || t.instrument === 'percussion';
      if (isDrum) {
        const part = new Tone.Part(
          (time, value) => {
            const v = value as { drum: string };
            triggerDrum(synth, v.drum, time);
          },
          t.notes.map((n) => ({ time: n.time * (60 / score.tempo), drum: n.note, duration: n.duration })),
        );
        part.start(0);
      } else {
        const part = new Tone.Part(
          (time, value) => {
            const v = value as { note: string; duration: string };
            (synth as Tone.PolySynth).triggerAttackRelease(v.note, v.duration, time);
          },
          t.notes.map((n) => ({ time: n.time * (60 / score.tempo), note: n.note, duration: n.duration })),
        );
        part.start(0);
      }
    });
    transport.start();
  }, duration + 1);

  const blob = encodeWav(audioBuffer);
  const slug = score.title.toLowerCase().replace(/\s+/g, '-').slice(0, 30);
  const trackName = singleTrackIdx !== null ? `-${score.tracks[singleTrackIdx].instrument}` : '';
  triggerDownload(blob, `${slug}${trackName}.wav`);
}

function encodeWav(audioBuffer: Tone.ToneAudioBuffer | AudioBuffer): Blob {
  const raw = audioBuffer instanceof AudioBuffer ? audioBuffer : audioBuffer.get();
  if (!raw) return new Blob([], { type: 'audio/wav' });

  const numChannels = 1;
  const sampleRate = raw.sampleRate;
  const samples = raw.getChannelData(0);
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    view.setInt16(offset, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseDurationBeats(d: string): number {
  const m = d.match(/^(\d+)n$/);
  if (m) return 4 / Number(m[1]);
  const f = parseFloat(d);
  return isNaN(f) ? 0.5 : f;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
