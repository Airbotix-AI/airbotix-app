// Track Lanes — one lane per generated track (music-stage-prd.md §4).
// Re-homed from the old MusicScorePlayer channel strips onto the shared
// useScorePlayback state so lane mute/solo and the stage dim state stay in
// sync (AC-6). Compact per PRD §2.1 so Stage + Lanes share one desktop screen.
//
// Per-track download / note editing / re-roll deliberately do NOT live on the
// Stage lane (8-year-old surface, PRD §4) — the `⋯` overflow menu at the lane
// tail is the shortcut into the Mixer via `onOpenMixer` (today: the legacy
// MusicTrackList region, music-stage-prd D-MX1; the score Mixer of parent PRD
// §3.5–3.9 replaces it later). Without `onOpenMixer` the entries stay greyed
// out with a one-line note — capability boundaries are stated, never faked.

import { useState } from 'react';
import clsx from 'clsx';

import { INSTRUMENT_META, type MusicScore, type ScoreTrack } from './scoreTypes';
import { isDrumNote, noteToMidi, parseDurationBeats } from './scoreUtils';
import { stageSlotFor, styleOf, type StageSlotId, type StageStyles } from './stageData';
import type { ScorePlayback } from './useScorePlayback';

const DRUM_LANE_ORDER = ['kick', 'tom', 'snare', 'clap', 'hat', 'ride'];
const MUTED_NOTE_FILL = '#C7C0D5'; // stone2 token — greyed-out note blocks
const MUTED_NOTE_EDGE = '#9C95AB'; // steel token

/** Actions the `⋯` menu forwards into the advanced Mixer (parent PRD §3.5–3.9). */
export type LaneMixerAction = 'download' | 'edit' | 'reroll';

const LANE_MENU_ITEMS: { action: LaneMixerAction; icon: string; label: string }[] = [
  { action: 'download', icon: '↓', label: 'Download track' },
  { action: 'edit', icon: '✏️', label: 'Edit notes' },
  { action: 'reroll', icon: '🔄', label: 'Re-roll −3⭐' },
];

export function TrackLanes({
  score,
  playback,
  styles,
  selectedSlot,
  onSelectSlot,
  silenced,
  onOpenMixer,
}: {
  score: MusicScore;
  playback: ScorePlayback;
  styles: StageStyles;
  selectedSlot: StageSlotId | null;
  onSelectSlot: (slot: StageSlotId) => void;
  silenced: ReadonlySet<string>;
  /** Deep link into the Mixer (legacy MusicTrackList region, D-MX1). */
  onOpenMixer?: (trackIndex: number, action: LaneMixerAction) => void;
}) {
  const [menuFor, setMenuFor] = useState<number | null>(null);
  // Light the currently-sounding notes only while the transport runs (PRD §4).
  const activeAtSec = playback.isPlaying ? playback.position : null;

  return (
    <div className="divide-y divide-hairline border-t border-hairline" data-testid="track-lanes">
      {score.tracks.map((track, idx) => {
        const meta = INSTRUMENT_META[track.instrument] ?? INSTRUMENT_META.other;
        const slot = stageSlotFor(track.instrument);
        const style = styleOf(slot, styles[slot]);
        const laneMuted =
          !!playback.muted[track.instrument] ||
          silenced.has(track.instrument) ||
          (playback.solo !== null && playback.solo !== track.instrument);
        return (
          <div
            key={idx}
            className={clsx('flex bg-canvas-pure', selectedSlot === slot && 'bg-wash-sunshine/40')}
            data-testid={`lane-${idx}`}
          >
            <div className="w-40 shrink-0 border-r border-hairline p-2">
              <button
                type="button"
                onClick={() => onSelectSlot(slot)}
                className="flex w-full items-center gap-1.5 rounded-lg px-1 py-0.5 text-left transition hover:bg-surface"
                title={`Select ${meta.label} on stage`}
                data-testid={`lane-select-${idx}`}
              >
                <span className="text-[16px]" aria-hidden="true">{meta.emoji}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[12px] font-bold text-ink">{meta.label}</span>
                  <span className="block truncate text-[10px] font-semibold text-slate2" data-testid={`lane-style-${idx}`}>
                    {style && style.gmProgram !== null ? style.label : 'None'}
                  </span>
                </span>
              </button>
              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => playback.toggleMute(track.instrument)}
                  className={clsx(
                    'inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold transition',
                    playback.muted[track.instrument]
                      ? 'bg-brand-coral text-white'
                      : 'bg-surface text-ink-soft hover:bg-surface-soft',
                  )}
                  title="Mute"
                  data-testid={`lane-mute-${idx}`}
                >
                  M
                </button>
                <button
                  type="button"
                  onClick={() => playback.toggleSolo(track.instrument)}
                  className={clsx(
                    'inline-flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold transition',
                    playback.solo === track.instrument
                      ? 'bg-brand-sunshine text-ink'
                      : 'bg-surface text-ink-soft hover:bg-surface-soft',
                  )}
                  title="Solo"
                  data-testid={`lane-solo-${idx}`}
                >
                  S
                </button>
                <span className="ml-1 text-[9px] font-bold text-slate2">VOL</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={playback.volumes[track.instrument] ?? 0.85}
                  onChange={(e) => playback.setVolume(track.instrument, Number(e.target.value))}
                  className="w-full min-w-0 flex-1 accent-brand-coral"
                  aria-label={`${meta.label} volume`}
                  data-testid={`lane-vol-${idx}`}
                />
              </div>
            </div>

            <div className="relative min-w-0 flex-1 p-2">
              <PianoRoll
                track={track}
                totalDuration={playback.totalDuration}
                tempo={score.tempo}
                muted={laneMuted}
                activeAtSec={activeAtSec}
              />
              <div
                className="absolute bottom-2 top-2 w-px bg-ink/60"
                style={{
                  left: `calc(0.5rem + (100% - 1rem) * ${
                    playback.totalDuration > 0
                      ? Math.min(1, playback.position / playback.totalDuration)
                      : 0
                  })`,
                }}
              />
            </div>

            <div className="relative flex shrink-0 items-start p-1">
              <button
                type="button"
                onClick={() => setMenuFor((m) => (m === idx ? null : idx))}
                className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[13px] font-bold text-ink-soft transition hover:bg-surface"
                title="More (in the Mixer)"
                aria-haspopup="menu"
                aria-expanded={menuFor === idx}
                data-testid={`lane-menu-btn-${idx}`}
              >
                ⋯
              </button>
              {menuFor === idx && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-10 cursor-default"
                    aria-label="Close menu"
                    onClick={() => setMenuFor(null)}
                  />
                  <div
                    role="menu"
                    className="absolute right-1 top-8 z-20 w-52 rounded-xl border border-hairline bg-canvas-pure p-1.5 shadow-lg"
                    onKeyDown={(e) => e.key === 'Escape' && setMenuFor(null)}
                    data-testid={`lane-menu-${idx}`}
                  >
                    <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate2">
                      {onOpenMixer ? 'Opens in the Mixer' : 'Opens in the Mixer — coming soon!'}
                    </p>
                    {LANE_MENU_ITEMS.map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        role="menuitem"
                        disabled={!onOpenMixer}
                        onClick={() => {
                          onOpenMixer?.(idx, item.action);
                          setMenuFor(null);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] font-semibold text-ink transition enabled:hover:bg-surface disabled:cursor-not-allowed disabled:opacity-40"
                        data-testid={`lane-menu-${item.action}-${idx}`}
                      >
                        <span aria-hidden="true">{item.icon}</span>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PianoRoll({
  track,
  totalDuration,
  tempo,
  muted,
  activeAtSec,
}: {
  track: ScoreTrack;
  totalDuration: number;
  tempo: number;
  muted: boolean;
  /** Transport position while playing, null when stopped — lights active notes. */
  activeAtSec: number | null;
}) {
  const meta = INSTRUMENT_META[track.instrument] ?? INSTRUMENT_META.other;
  const notes = track.notes;
  if (notes.length === 0 || totalDuration === 0) {
    return <div className="h-12 rounded-md bg-surface" />;
  }
  const drums = isDrumNote(notes[0].note);
  const pitches = drums ? null : notes.map((n) => noteToMidi(n.note));
  const lo = pitches ? Math.min(...pitches) : 0;
  const hi = pitches ? Math.max(...pitches) : 0;
  const range = Math.max(1, hi - lo);

  return (
    <div className="relative h-12 overflow-hidden rounded-md bg-surface" data-testid="piano-roll">
      {notes.map((n, i) => {
        const startSec = n.time * (60 / tempo);
        const widthSec = parseDurationBeats(n.duration) * (60 / tempo);
        const leftPct = (startSec / totalDuration) * 100;
        const widthPct = Math.max(0.6, (widthSec / totalDuration) * 100);
        const active =
          !muted &&
          activeAtSec !== null &&
          activeAtSec >= startSec &&
          activeAtSec < startSec + widthSec;
        let topPct: number;
        let heightPct: number;
        if (drums) {
          const lane = Math.max(0, DRUM_LANE_ORDER.indexOf(n.note));
          topPct = 6 + lane * 15;
          heightPct = 12;
        } else {
          const midi = noteToMidi(n.note);
          topPct = 5 + (1 - (midi - lo) / range) * 80;
          heightPct = 10;
        }
        return (
          <div
            key={i}
            className="absolute rounded-sm"
            data-note-active={active || undefined}
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              top: `${topPct}%`,
              height: `${heightPct}%`,
              backgroundColor: muted ? MUTED_NOTE_FILL : active ? meta.color.hex : meta.color.soft,
              border: `1px solid ${muted ? MUTED_NOTE_EDGE : meta.color.hex}`,
              boxShadow: active ? `0 0 6px ${meta.color.hex}` : undefined,
              opacity: muted ? 0.4 : 1,
            }}
          />
        );
      })}
    </div>
  );
}
