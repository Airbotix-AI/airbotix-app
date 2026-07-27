// Music Mission Mode (music-stage-prd §5A D-MS14, P2b) — the Music Stage end
// of the existing four-layer course machinery, mirroring the Art Studio's
// Mission Mode (image-studio-prd D-IS-20/22):
//
//   Mission.steps_json.music = {
//     template?: { mode: 'base' | 'reference', riff: <seed-score shape> },
//     checklist?: string[],           // extra display-only reminders
//     accept?:   { ...deterministic riff checks below }
//   }
//
// - A `base` template pre-loads the pad as an IMMUTABLE layer below the kid's
//   notes (populate-it 配器 / complete-it 续写): it plays, and it rides the
//   seed — the kid builds ON it, never edits it (D-IS-22 authorship boundary).
// - A `reference` template renders as the erasable ghost layer instead
//   (copy-it 临摹): visible to trace, excluded from playback and the seed —
//   the evaluation subject is the kid's own notes (the `strokes-only` mirror).
// - Acceptance is DETERMINISTIC MACHINE CHECKS on the kid's OWN grid — a riff
//   is JSON, so unlike the art vision look this costs zero LLM calls. The
//   checks say what to ADD, never how good the riff is (a kid's music is
//   never scored). Server-side, submit still gates on the saved score
//   artifact (`must_have_kinds`), same chain as art (+3★, D-M3).

import {
  emptyRiff,
  riffNoteCount,
  riffToSeedScore,
  seedRiffFromMetadata,
  seedToRiffGrid,
  type RiffGrid,
  type SeedScore,
} from './riffPad';

export interface MusicMissionTemplate {
  mode: 'base' | 'reference';
  riff: SeedScore;
}

/** Deterministic acceptance checks — evaluated on the KID's own notes. */
export interface MusicMissionAccept {
  /** At least this many melody notes tapped. */
  min_melody_notes?: number;
  /** At least this many DIFFERENT pitches used (melody rows). */
  min_distinct_pitches?: number;
  /** At least one drum step (kick/snare/hat). */
  needs_drums?: boolean;
  /** At least one melody note on an off-beat step (the "and" between counts). */
  needs_offbeat?: boolean;
}

export interface MusicMission {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  template?: MusicMissionTemplate;
  checklist?: string[];
  accept?: MusicMissionAccept;
}

export interface MissionCheckItem {
  label: string;
  ok: boolean;
}

/** Defensive parse of a router-state mission (PackLessonsPage emits it, but
 *  history state is untyped at this boundary). */
export function parseMusicMission(value: unknown): MusicMission | null {
  if (!value || typeof value !== 'object') return null;
  const m = value as Partial<MusicMission> & { template?: { mode?: unknown; riff?: unknown } };
  if (typeof m.id !== 'string' || typeof m.title !== 'string') return null;
  let template: MusicMissionTemplate | undefined;
  if (m.template) {
    const riff = seedRiffFromMetadata(m.template.riff);
    const mode = m.template.mode === 'reference' ? 'reference' : 'base';
    if (riff) template = { mode, riff };
  }
  return {
    id: m.id,
    slug: typeof m.slug === 'string' ? m.slug : undefined,
    title: m.title,
    description: typeof m.description === 'string' ? m.description : undefined,
    template,
    checklist: Array.isArray(m.checklist) ? m.checklist.filter((c) => typeof c === 'string') : undefined,
    accept: m.accept && typeof m.accept === 'object' ? (m.accept as MusicMissionAccept) : undefined,
  };
}

/** The mission template as a pad layer (null when it has no on-grid notes). */
export function missionTemplateGrid(mission: MusicMission | null): RiffGrid | null {
  if (!mission?.template) return null;
  return seedToRiffGrid(mission.template.riff);
}

function melodyNoteCount(grid: RiffGrid): number {
  return grid.melody.reduce((sum, row) => sum + row.filter(Boolean).length, 0);
}

function distinctPitches(grid: RiffGrid): number {
  return grid.melody.filter((row) => row.some(Boolean)).length;
}

function hasDrums(grid: RiffGrid): boolean {
  return grid.drums.some((row) => row.some(Boolean));
}

/** Off-beat = an odd 8n step — the "and" between the counts. */
function hasOffbeat(grid: RiffGrid): boolean {
  return grid.melody.some((row) => row.some((on, step) => on && step % 2 === 1));
}

/**
 * Evaluate the deterministic checks against the KID's own grid. Labels are
 * next-step language, never grades (D-IS-20 hard rule inherited by §5A).
 */
export function evaluateMusicMission(
  accept: MusicMissionAccept | undefined,
  kidGrid: RiffGrid,
): MissionCheckItem[] {
  if (!accept) return [];
  const items: MissionCheckItem[] = [];
  if (accept.min_melody_notes !== undefined) {
    const n = melodyNoteCount(kidGrid);
    items.push({
      label: `Tap at least ${accept.min_melody_notes} melody notes (${Math.min(n, accept.min_melody_notes)}/${accept.min_melody_notes})`,
      ok: n >= accept.min_melody_notes,
    });
  }
  if (accept.min_distinct_pitches !== undefined) {
    items.push({
      label: `Use at least ${accept.min_distinct_pitches} different notes`,
      ok: distinctPitches(kidGrid) >= accept.min_distinct_pitches,
    });
  }
  if (accept.needs_drums) {
    items.push({ label: 'Add a beat — kick, snare or hat', ok: hasDrums(kidGrid) });
  }
  if (accept.needs_offbeat) {
    items.push({
      label: 'Put one melody note on an off-beat (the “and” between counts)',
      ok: hasOffbeat(kidGrid),
    });
  }
  return items;
}

export function missionChecksMet(items: MissionCheckItem[]): boolean {
  return items.every((i) => i.ok);
}

/** Union of two grids (kid layer ∪ base template) for playback + the seed. */
export function unionRiffGrids(a: RiffGrid, b: RiffGrid | null): RiffGrid {
  if (!b) return a;
  const merge = (x: boolean[][], y: boolean[][]) =>
    x.map((row, r) => row.map((on, s) => on || y[r][s]));
  return { melody: merge(a.melody, b.melody), drums: merge(a.drums, b.drums) };
}

/**
 * The seed the compose request should carry in Mission Mode: kid notes plus a
 * `base` template (the whole scene grows into the song — populate-it), or the
 * kid's notes alone for `reference` templates (copy-it evaluates THEIR line).
 */
export function missionSeed(
  kidGrid: RiffGrid,
  mission: MusicMission | null,
): SeedScore | null {
  if (!mission?.template || mission.template.mode !== 'base') {
    return riffToSeedScore(kidGrid);
  }
  const base = missionTemplateGrid(mission) ?? emptyRiff();
  const merged = unionRiffGrids(kidGrid, base);
  return riffNoteCount(merged) > 0 ? riffToSeedScore(merged) : null;
}
