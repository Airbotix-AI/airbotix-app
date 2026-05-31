// MIDI-style multi-instrument player rendered with Tone.js synths.
// Backend `/llm/music-score` returns a JSON score; this component renders
// each instrument as a channel strip + piano-roll lane, with synced
// Tone.Transport playback (true multitrack — not sequential).
//
// V0 uses only Tone.js built-in synths so we have zero asset deps. V1 could
// load real soundfont samples via smplr for higher fidelity.

import { useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';

export interface ScoreNote {
  time: number;
  note: string;
  duration: string;
}
export interface ScoreTrack {
  instrument: 'piano' | 'guitar' | 'bass' | 'drums' | 'strings' | 'synth' | 'flute';
  notes: ScoreNote[];
}
export interface MusicScore {
  title: string;
  tempo: number;
  key: string;
  tracks: ScoreTrack[];
}

const INSTRUMENT_META: Record<
  ScoreTrack['instrument'],
  { emoji: string; color: { hex: string; soft: string }; label: string }
> = {
  piano:   { emoji: '🎹', color: { hex: '#ef5b3d', soft: '#ffb3a7' }, label: 'Piano'   },
  guitar:  { emoji: '🎸', color: { hex: '#ff5fa8', soft: '#ffb8d4' }, label: 'Guitar'  },
  bass:    { emoji: '🎛',  color: { hex: '#4c8df8', soft: '#aac8fa' }, label: 'Bass'    },
  drums:   { emoji: '🥁', color: { hex: '#2dc28d', soft: '#9ee5cb' }, label: 'Drums'   },
  strings: { emoji: '🎻', color: { hex: '#f5b524', soft: '#ffe0a0' }, label: 'Strings' },
  synth:   { emoji: '🎚',  color: { hex: '#9d6bff', soft: '#d6c2ff' }, label: 'Synth'   },
  flute:   { emoji: '🪈', color: { hex: '#67d4ff', soft: '#bdeaff' }, label: 'Flute'   },
};

export function MusicScorePlayer({
  score,
  onAddTrack,
  onImportTrack,
}: {
  score: MusicScore;
  onAddTrack?: () => void;
  onImportTrack?: () => void;
}) {
  // Synth voices kept generic — they all expose triggerAttackRelease + connect + dispose.
  const synthsRef = useRef<Record<number, Tone.PolySynth | Tone.MembraneSynth | Tone.MonoSynth | Tone.PluckSynth>>({});
  const channelsRef = useRef<Record<number, Tone.Channel>>({});
  const partsRef = useRef<Tone.Part[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0); // seconds
  const [muted, setMuted] = useState<Record<number, boolean>>({});
  const [soloIdx, setSoloIdx] = useState<number | null>(null);
  const [volumes, setVolumes] = useState<Record<number, number>>({});

  const totalDuration = useMemo(() => {
    // Length in seconds: max note end time across all tracks, converted from beats
    let maxBeat = 0;
    for (const t of score.tracks) {
      for (const n of t.notes) {
        const end = n.time + parseDurationBeats(n.duration);
        if (end > maxBeat) maxBeat = end;
      }
    }
    return (maxBeat * 60) / score.tempo;
  }, [score]);

  // Build synths + schedule parts on mount / score change
  useEffect(() => {
    Tone.getTransport().bpm.value = score.tempo;

    // Tear down old
    for (const part of partsRef.current) part.dispose();
    partsRef.current = [];
    for (const k of Object.keys(synthsRef.current)) {
      const s = synthsRef.current[Number(k)] as { dispose: () => void };
      s.dispose();
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

      if (t.instrument === 'drums') {
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
        const s = synthsRef.current[Number(k)] as { dispose: () => void };
        s.dispose();
      }
      for (const k of Object.keys(channelsRef.current)) channelsRef.current[Number(k)].dispose();
      synthsRef.current = {};
      channelsRef.current = {};
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
    };
  }, [score]);

  // Push mute / solo state into channels
  useEffect(() => {
    score.tracks.forEach((_, idx) => {
      const ch = channelsRef.current[idx];
      if (!ch) return;
      const isMuted = !!muted[idx] || (soloIdx !== null && soloIdx !== idx);
      ch.mute = isMuted;
    });
  }, [muted, soloIdx, score.tracks]);

  // Push volume
  useEffect(() => {
    score.tracks.forEach((_, idx) => {
      const ch = channelsRef.current[idx];
      if (!ch) return;
      const v = volumes[idx] ?? 0.85;
      ch.volume.value = Tone.gainToDb(v);
    });
  }, [volumes, score.tracks]);

  // Position ticker
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
    await Tone.start(); // user-gesture handshake required by browsers
    Tone.getTransport().start();
    setIsPlaying(true);
  };
  const stop = () => {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    setPosition(0);
    setIsPlaying(false);
  };

  const seekFrac = totalDuration > 0 ? Math.min(1, position / totalDuration) : 0;

  return (
    <aside className="hidden lg:flex w-[560px] shrink-0 flex-col bg-slate-950 text-slate-100 border-l border-slate-800">
      {/* ─── Transport bar ─── */}
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.14em] text-slate-400 font-bold">
              🎛 Music Studio · MIDI
            </div>
            <div className="text-[14px] font-bold text-slate-100 mt-0.5 truncate">
              {score.title}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {score.tempo} BPM · {score.key} · {score.tracks.length} instruments
            </div>
          </div>
          <div className="font-mono text-[18px] tabular-nums text-slate-100">
            {fmtTime(position)} <span className="text-slate-500">/ {fmtTime(totalDuration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isPlaying ? (
            <TransportBtn primary onClick={stop} label="Stop">⏹</TransportBtn>
          ) : (
            <TransportBtn primary onClick={play} label="Play">▶</TransportBtn>
          )}
          <TransportBtn onClick={stop} label="Rewind">⏮</TransportBtn>
          <div className="ml-3 flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-coral to-brand-bubblegum transition-[width] ease-linear"
              style={{ width: `${seekFrac * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* ─── Per-instrument channel strips ─── */}
      <div className="flex-1 overflow-y-auto">
        {score.tracks.map((t, idx) => (
          <ChannelStrip
            key={idx}
            index={idx}
            track={t}
            meta={INSTRUMENT_META[t.instrument]}
            position={position}
            totalDuration={totalDuration}
            isMuted={!!muted[idx]}
            isSolo={soloIdx === idx}
            volume={volumes[idx] ?? 0.85}
            tempo={score.tempo}
            onToggleMute={() => setMuted((m) => ({ ...m, [idx]: !m[idx] }))}
            onToggleSolo={() => setSoloIdx((s) => (s === idx ? null : idx))}
            onVolume={(v) => setVolumes((m) => ({ ...m, [idx]: v }))}
          />
        ))}

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

function ChannelStrip({
  index,
  track,
  meta,
  position,
  totalDuration,
  isMuted,
  isSolo,
  volume,
  tempo,
  onToggleMute,
  onToggleSolo,
  onVolume,
}: {
  index: number;
  track: ScoreTrack;
  meta: (typeof INSTRUMENT_META)[ScoreTrack['instrument']];
  position: number;
  totalDuration: number;
  isMuted: boolean;
  isSolo: boolean;
  volume: number;
  tempo: number;
  onToggleMute: () => void;
  onToggleSolo: () => void;
  onVolume: (v: number) => void;
}) {
  const effectivelyMuted = isMuted;
  return (
    <div className="flex border-b border-slate-800 hover:bg-slate-900/40 transition-colors">
      {/* Channel strip */}
      <div className="w-44 shrink-0 p-3 border-r border-slate-800 bg-slate-900/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[18px]">{meta.emoji}</span>
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: meta.color.hex }}
          />
          <div className="text-[10px] font-bold tracking-[0.10em] text-slate-400">
            TRACK {index + 1}
          </div>
        </div>
        <div className="text-[13px] font-bold text-slate-100 mb-2">{meta.label}</div>
        <div className="text-[10px] text-slate-500 mb-2">{track.notes.length} notes</div>

        <div className="flex items-center gap-1 mb-2">
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
            onChange={(e) => onVolume(Number(e.target.value))}
            className="flex-1 accent-brand-coral"
          />
        </div>
      </div>

      {/* Piano-roll lane */}
      <div className="flex-1 min-w-0 p-3 relative">
        <PianoRoll
          notes={track.notes}
          totalDuration={totalDuration}
          tempo={tempo}
          color={meta.color}
          muted={effectivelyMuted}
        />
        <div
          className="absolute top-3 bottom-3 w-px bg-slate-100/80"
          style={{
            left: `calc(0.75rem + (100% - 1.5rem) * ${totalDuration > 0 ? Math.min(1, position / totalDuration) : 0})`,
          }}
        />
      </div>
    </div>
  );
}

function PianoRoll({
  notes,
  totalDuration,
  tempo,
  color,
  muted,
}: {
  notes: ScoreNote[];
  totalDuration: number;
  tempo: number;
  color: { hex: string; soft: string };
  muted: boolean;
}) {
  if (notes.length === 0 || totalDuration === 0) {
    return <div className="h-16 rounded-md bg-slate-800/40" />;
  }
  // Pitch range for normalisation (drums use fixed lanes)
  const isDrums = notes[0].note === 'kick' || notes[0].note === 'snare' || notes[0].note === 'hat';
  const pitches = isDrums ? null : notes.map((n) => noteToMidi(n.note));
  const lo = pitches ? Math.min(...pitches) : 0;
  const hi = pitches ? Math.max(...pitches) : 0;
  const range = Math.max(1, hi - lo);

  return (
    <div className="relative h-16 rounded-md bg-slate-800/30 overflow-hidden">
      {notes.map((n, i) => {
        const startSec = n.time * (60 / tempo);
        const widthSec = parseDurationBeats(n.duration) * (60 / tempo);
        const leftPct = (startSec / totalDuration) * 100;
        const widthPct = Math.max(0.6, (widthSec / totalDuration) * 100);
        let topPct: number;
        let heightPct: number;
        if (isDrums) {
          const lane = n.note === 'kick' ? 0 : n.note === 'snare' ? 1 : 2;
          topPct = 10 + lane * 30;
          heightPct = 18;
        } else {
          const midi = noteToMidi(n.note);
          topPct = 5 + (1 - (midi - lo) / range) * 80;
          heightPct = 10;
        }
        return (
          <div
            key={i}
            className="absolute rounded-sm"
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              top: `${topPct}%`,
              height: `${heightPct}%`,
              backgroundColor: muted ? '#475569' : color.soft,
              border: `1px solid ${muted ? '#64748b' : color.hex}`,
              opacity: muted ? 0.4 : 1,
            }}
          />
        );
      })}
    </div>
  );
}

function ActionCard({
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

function TransportBtn({
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

// ── helpers ─────────────────────────────────────────────────────────────────

function makeSynthFor(instrument: ScoreTrack['instrument']) {
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
      // We use a MembraneSynth as a generic drum voice; triggerDrum handles
      // kick/snare/hat via pitch + envelope tweaks below.
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.4 },
      });
  }
}

function triggerDrum(synth: unknown, drum: string, time: number) {
  // synth is a MembraneSynth here; for snare/hat we'd ideally have separate
  // NoiseSynths, but to keep dep count low we map all to a percussive envelope.
  if (drum === 'kick') {
    // @ts-expect-error triggerAttackRelease on MembraneSynth
    synth.triggerAttackRelease('C1', '8n', time);
  } else if (drum === 'snare') {
    // @ts-expect-error triggerAttackRelease on NoiseSynth/MembraneSynth
    synth.triggerAttackRelease('A1', '16n', time);
  } else {
    // hat
    // @ts-expect-error triggerAttackRelease on MetalSynth
    synth.triggerAttackRelease('A4', '32n', time, 0.3);
  }
}

function parseDurationBeats(d: string): number {
  // Tone.js notation: "1n"=4, "2n"=2, "4n"=1, "8n"=0.5, "16n"=0.25
  const m = d.match(/^(\d+)n$/);
  if (m) return 4 / Number(m[1]);
  const f = parseFloat(d);
  return isNaN(f) ? 0.5 : f;
}

function noteToMidi(note: string): number {
  // "C4" → 60, "C#4" → 61
  const m = note.match(/^([A-Ga-g])([#b]?)(\d+)$/);
  if (!m) return 60;
  const letter = m[1].toUpperCase();
  const acc = m[2];
  const octave = Number(m[3]);
  const semis: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  let n = semis[letter] + 12 * (octave + 1);
  if (acc === '#') n += 1;
  if (acc === 'b') n -= 1;
  return n;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
