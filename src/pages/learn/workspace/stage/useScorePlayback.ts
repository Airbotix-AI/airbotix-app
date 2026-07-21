// Tone.js playback engine for a MusicScore, lifted out of the old
// MusicScorePlayer so the Stage (pulses, walk lights, dim states) and the
// Track Lanes share ONE transport + mixer state (music-stage-prd §3–§4).
//
// Mute / solo / volume are keyed by INSTRUMENT KIND (not track index) so the
// kid's manual mixing survives version switches even when the LLM reorders
// tracks (AC-7). Voices are smplr GM soundfonts with styled Tone.js fallbacks
// (PRD §5 + §6.1, AC-11) behind stable per-track controllers — style changes
// swap the voice in place and never touch the Transport scheduling (AC-5).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Tone from 'tone';

import type { InstrumentKind, MusicScore, StageTweaks } from './scoreTypes';
import { parseDurationBeats, scoreDurationSeconds, transposeNote } from './scoreUtils';
import { INSTRUMENT_STYLES, STYLE_NONE, stageSlotFor, type StageSlotId, type StageStyles } from './stageData';
import { createTrackVoice, type TrackVoice } from './voices';

const DEFAULT_VOLUME = 0.85;
const DEFAULT_VELOCITY = 0.9;
const POSITION_POLL_MS = 50;
const PREVIEW_TEMPO_FALLBACK_BPM = 100;
const PREVIEW_VELOCITY = 0.9;
const PREVIEW_TAIL_SECONDS = 2;

/** One representative note per slot for the 1-beat style preview (PRD §5). */
const PREVIEW_NOTES: Record<StageSlotId, string> = {
  guitar: 'E3',
  bass: 'E2',
  drums: 'kick',
  piano: 'C4',
  keys: 'C4',
};

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
  /** 1-beat timbre audition after picking a style, when not playing (0⭐). */
  previewStyle: (slot: StageSlotId, styleId: string) => Promise<void>;
}

function defaultStyleFor(slot: StageSlotId): string {
  return INSTRUMENT_STYLES[slot][0].id;
}

export function useScorePlayback(
  score: MusicScore | null,
  /** Instruments silenced from outside the mixer (style = None, PRD §3.1). */
  silenced?: ReadonlySet<string>,
  /** Current per-slot instrument styles; drives the voice timbres (PRD §5). */
  styles?: StageStyles,
  /** Lane Edit-drawer tweaks (octave/pan, track-editing PRD §3-A) by instrument. */
  tweaks?: StageTweaks,
): ScorePlayback {
  const channelsRef = useRef<Tone.Channel[]>([]);
  const partsRef = useRef<Tone.Part[]>([]);
  const voicesRef = useRef<(TrackVoice | null)[]>([]);
  const voiceSpecsRef = useRef<(string | null)[]>([]);
  const pulseListenersRef = useRef<Set<PulseListener>>(new Set());
  const pulseTimersRef = useRef<Set<number>>(new Set());

  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  const [solo, setSolo] = useState<InstrumentKind | null>(null);
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // Octave shifts apply at trigger time (mid-playback changes affect the very
  // next note) — a ref keeps the Tone.Part callbacks free of stale closures.
  const tweaksRef = useRef<StageTweaks | undefined>(tweaks);
  tweaksRef.current = tweaks;

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

  // Build channels + schedule parts whenever the score changes. Voices live in
  // a separate effect so a style change never rebuilds the schedule.
  useEffect(() => {
    if (!score) return;
    Tone.getTransport().bpm.value = score.tempo;
    const secondsPerBeat = 60 / score.tempo;

    score.tracks.forEach((t, idx) => {
      const channel = new Tone.Channel({ volume: 0, pan: 0 }).toDestination();
      channelsRef.current.push(channel);

      const events = t.notes.map((n) => ({
        time: n.time * secondsPerBeat,
        note: n.note,
        durationSec: parseDurationBeats(n.duration) * secondsPerBeat,
        velocity: n.velocity ?? DEFAULT_VELOCITY,
      }));
      const part = new Tone.Part((time, value) => {
        const v = value as (typeof events)[number];
        const octave = tweaksRef.current?.[t.instrument]?.octave ?? 0;
        const note = octave === 0 ? v.note : transposeNote(v.note, octave * 12);
        voicesRef.current[idx]?.trigger(note, v.durationSec, time, v.velocity);
        emitPulse(t.instrument, time);
      }, events);
      part.start(0);
      partsRef.current.push(part);
    });

    const timers = pulseTimersRef.current;
    return () => {
      for (const part of partsRef.current) part.dispose();
      for (const voice of voicesRef.current) voice?.dispose();
      for (const ch of channelsRef.current) ch.dispose();
      partsRef.current = [];
      voicesRef.current = [];
      voiceSpecsRef.current = [];
      channelsRef.current = [];
      for (const id of timers) window.clearTimeout(id);
      timers.clear();
      Tone.getTransport().stop();
      Tone.getTransport().position = 0;
      setIsPlaying(false);
      setPosition(0);
    };
  }, [score, emitPulse]);

  // (Re)build per-track voices when the score or a slot style changes. Only
  // tracks whose spec actually changed are swapped — in place, mid-playback.
  useEffect(() => {
    score?.tracks.forEach((t, idx) => {
      const channel = channelsRef.current[idx];
      if (!channel) return;
      const slot = stageSlotFor(t.instrument);
      const styleId = styles?.[slot] ?? defaultStyleFor(slot);
      const spec = `${t.instrument}|${slot}|${styleId}`;
      if (voiceSpecsRef.current[idx] === spec && voicesRef.current[idx]) return;
      voicesRef.current[idx]?.dispose();
      voicesRef.current[idx] = createTrackVoice(slot, styleId, channel, t.instrument);
      voiceSpecsRef.current[idx] = spec;
    });
  }, [score, styles]);

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

  // Push pan (lane Edit drawer, track-editing PRD §3-A).
  useEffect(() => {
    score?.tracks.forEach((t, idx) => {
      const ch = channelsRef.current[idx];
      if (!ch) return;
      ch.pan.value = Math.max(-1, Math.min(1, tweaks?.[t.instrument]?.pan ?? 0));
    });
  }, [tweaks, score]);

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

  // 1-beat audition of a freshly picked style. Skipped while playing — the
  // live song already demonstrates the new timbre (PRD §5).
  const tempo = score?.tempo ?? PREVIEW_TEMPO_FALLBACK_BPM;
  const previewStyle = useCallback(
    async (slot: StageSlotId, styleId: string) => {
      if (styleId === STYLE_NONE || isPlayingRef.current) return;
      await Tone.start(); // called from the style-tag click, gesture is live
      const channel = new Tone.Channel({ volume: 0, pan: 0 }).toDestination();
      const voice = createTrackVoice(slot, styleId, channel);
      await voice.ready; // bounded by the soundfont load timeout
      if (isPlayingRef.current) {
        // Playback started while the soundfont loaded — the song takes over.
        voice.dispose();
        channel.dispose();
        return;
      }
      const beatSeconds = 60 / tempo;
      voice.trigger(PREVIEW_NOTES[slot], beatSeconds, Tone.now(), PREVIEW_VELOCITY);
      window.setTimeout(
        () => {
          voice.dispose();
          channel.dispose();
        },
        (beatSeconds + PREVIEW_TAIL_SECONDS) * 1000,
      );
    },
    [tempo],
  );

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
    previewStyle,
  };
}
