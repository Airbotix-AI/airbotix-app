// Tone.js playback engine for a MusicScore, lifted out of the old
// MusicScorePlayer so the Stage (pulses, walk lights, dim states) and the
// Track Lanes share ONE transport + mixer state (music-stage-prd §3–§4).
//
// Mute / solo / volume are keyed by INSTRUMENT KIND (not track index) so the
// kid's manual mixing survives version switches even when the LLM reorders
// tracks (AC-7). Timbres are V0 Tone.js synths; the smplr soundfont task
// (PRD §6.1) swaps the voice factory, not this scheduling.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';

import type { InstrumentKind, MusicScore } from './scoreTypes';
import { scoreDurationSeconds } from './scoreUtils';

const DEFAULT_VOLUME = 0.85;
const DEFAULT_VELOCITY = 0.9;
const POSITION_POLL_MS = 50;

type SynthVoice = Tone.PolySynth | Tone.MembraneSynth | Tone.MonoSynth | Tone.PluckSynth;

export type PulseListener = (instrument: InstrumentKind) => void;

export interface ScorePlayback {
  isPlaying: boolean;
  /** Transport position in seconds. */
  position: number;
  totalDuration: number;
  play: () => Promise<void>;
  stop: () => void;
  /** Resume the AudioContext inside a user gesture (before async work). */
  unlock: () => Promise<void>;
  muted: Readonly<Record<string, boolean>>;
  toggleMute: (instrument: InstrumentKind) => void;
  solo: InstrumentKind | null;
  toggleSolo: (instrument: InstrumentKind) => void;
  volumes: Readonly<Record<string, number>>;
  setVolume: (instrument: InstrumentKind, v: number) => void;
  /** Subscribe to note-trigger pulses; returns an unsubscribe fn. */
  onPulse: (cb: PulseListener) => () => void;
}

export function useScorePlayback(
  score: MusicScore | null,
  /** Instruments silenced from outside the mixer (style = None, PRD §3.1). */
  silenced?: ReadonlySet<string>,
): ScorePlayback {
  const synthsRef = useRef<SynthVoice[]>([]);
  const channelsRef = useRef<Tone.Channel[]>([]);
  const partsRef = useRef<Tone.Part[]>([]);
  const pulseListenersRef = useRef<Set<PulseListener>>(new Set());
  const pulseTimersRef = useRef<Set<number>>(new Set());

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [solo, setSolo] = useState<InstrumentKind | null>(null);
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  const totalDuration = useMemo(() => (score ? scoreDurationSeconds(score) : 0), [score]);

  const emitPulse = useCallback((instrument: InstrumentKind, audioTime: number) => {
    // Align the visual pulse with the audible hit (parts schedule ahead).
    const delay = Math.max(0, (audioTime - Tone.now()) * 1000);
    const id = window.setTimeout(() => {
      pulseTimersRef.current.delete(id);
      for (const cb of pulseListenersRef.current) cb(instrument);
    }, delay);
    pulseTimersRef.current.add(id);
  }, []);

  // Build synths + schedule parts whenever the score changes.
  useEffect(() => {
    if (!score) return;
    Tone.getTransport().bpm.value = score.tempo;
    const secondsPerBeat = 60 / score.tempo;

    score.tracks.forEach((t) => {
      const channel = new Tone.Channel({ volume: 0, pan: 0 }).toDestination();
      channelsRef.current.push(channel);
      const synth = makeSynthFor(t.instrument);
      synth.connect(channel);
      synthsRef.current.push(synth);

      const isDrumTrack = t.instrument === 'drums' || t.instrument === 'percussion';
      const events = t.notes.map((n) => ({
        time: n.time * secondsPerBeat,
        note: n.note,
        duration: n.duration,
        velocity: n.velocity ?? DEFAULT_VELOCITY,
      }));
      const part = new Tone.Part((time, value) => {
        const v = value as (typeof events)[number];
        if (isDrumTrack) {
          triggerDrum(synth, v.note, time, v.velocity);
        } else {
          (synth as Tone.PolySynth).triggerAttackRelease(v.note, v.duration, time, v.velocity);
        }
        emitPulse(t.instrument, time);
      }, events);
      part.start(0);
      partsRef.current.push(part);
    });

    const timers = pulseTimersRef.current;
    return () => {
      for (const part of partsRef.current) part.dispose();
      for (const synth of synthsRef.current) synth.dispose();
      for (const ch of channelsRef.current) ch.dispose();
      partsRef.current = [];
      synthsRef.current = [];
      channelsRef.current = [];
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
      setIsPlaying(false);
      setPosition(0);
    };
  }, [score, emitPulse]);

  // Push mute / solo / silenced state into channels.
  useEffect(() => {
    score?.tracks.forEach((t, idx) => {
      const ch = channelsRef.current[idx];
      if (!ch) return;
      ch.mute =
        !!muted[t.instrument] ||
        !!silenced?.has(t.instrument) ||
        (solo !== null && solo !== t.instrument);
    });
  }, [muted, solo, silenced, score]);

  // Push volume.
  useEffect(() => {
    score?.tracks.forEach((t, idx) => {
      const ch = channelsRef.current[idx];
      if (!ch) return;
      ch.volume.value = Tone.gainToDb(volumes[t.instrument] ?? DEFAULT_VOLUME);
    });
  }, [volumes, score]);

  // Position ticker with auto-stop at the end of the song.
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
    }, POSITION_POLL_MS);
    return () => window.clearInterval(id);
  }, [isPlaying, totalDuration]);

  const unlock = useCallback(async () => {
    await Tone.start();
  }, []);

  const play = useCallback(async () => {
    await Tone.start(); // user-gesture handshake required by browsers
    Tone.getTransport().start();
    setIsPlaying(true);
  }, []);

  const stop = useCallback(() => {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    setPosition(0);
    setIsPlaying(false);
  }, []);

  const toggleMute = useCallback((instrument: InstrumentKind) => {
    setMuted((m) => ({ ...m, [instrument]: !m[instrument] }));
  }, []);

  const toggleSolo = useCallback((instrument: InstrumentKind) => {
    setSolo((s) => (s === instrument ? null : instrument));
  }, []);

  const setVolume = useCallback((instrument: InstrumentKind, v: number) => {
    setVolumes((m) => ({ ...m, [instrument]: v }));
  }, []);

  const onPulse = useCallback((cb: PulseListener) => {
    pulseListenersRef.current.add(cb);
    return () => {
      pulseListenersRef.current.delete(cb);
    };
  }, []);

  return {
    isPlaying,
    position,
    totalDuration,
    play,
    stop,
    unlock,
    muted,
    toggleMute,
    solo,
    toggleSolo,
    volumes,
    setVolume,
    onPulse,
  };
}

// ── voices ───────────────────────────────────────────────────────────────────

function makeSynthFor(instrument: InstrumentKind): SynthVoice {
  switch (instrument) {
    case 'piano':
    case 'keyboard':
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
    case 'pad':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.6, decay: 0.2, sustain: 0.8, release: 1.5 },
      });
    case 'brass':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.08, decay: 0.2, sustain: 0.7, release: 0.5 },
      });
    case 'synth':
    case 'other':
      return new Tone.PolySynth(Tone.FMSynth);
    case 'flute':
    case 'lead_vocals':
    case 'backing_vocals':
      return new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.15, decay: 0.1, sustain: 0.6, release: 0.8 },
      });
    case 'drums':
    case 'percussion':
      // One MembraneSynth as a generic drum voice; triggerDrum maps hit names
      // to pitch + duration. The smplr task brings real GM drum kits.
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 6,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0.0, release: 0.4 },
      });
  }
}

const DRUM_VOICE: Record<string, { pitch: string; duration: string; velocity: number }> = {
  kick:  { pitch: 'C1', duration: '8n',  velocity: 1 },
  tom:   { pitch: 'G1', duration: '8n',  velocity: 0.9 },
  snare: { pitch: 'A1', duration: '16n', velocity: 0.9 },
  clap:  { pitch: 'B1', duration: '16n', velocity: 0.8 },
  hat:   { pitch: 'A4', duration: '32n', velocity: 0.3 },
  ride:  { pitch: 'D5', duration: '16n', velocity: 0.25 },
};

function triggerDrum(synth: SynthVoice, hit: string, time: number, velocity: number) {
  const voice = DRUM_VOICE[hit] ?? DRUM_VOICE.kick;
  (synth as Tone.MembraneSynth).triggerAttackRelease(
    voice.pitch,
    voice.duration,
    time,
    voice.velocity * velocity,
  );
}
