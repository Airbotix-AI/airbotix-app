import type { ScoreNote } from './MusicScorePlayer';

function parseDurationBeats(d: string): number {
  const m = d.match(/^(\d+)n$/);
  if (m) return 4 / Number(m[1]);
  const f = parseFloat(d);
  return isNaN(f) ? 0.5 : f;
}

function noteToMidi(note: string): number {
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

export function PianoRoll({
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
  const isDrums =
    notes[0].note === 'kick' || notes[0].note === 'snare' || notes[0].note === 'hat' ||
    notes[0].note === 'ride' || notes[0].note === 'clap' || notes[0].note === 'tom';
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
          const drumLanes: Record<string, number> = { kick: 0, snare: 1, hat: 2, ride: 2, clap: 1, tom: 0 };
          const lane = drumLanes[n.note] ?? 1;
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
