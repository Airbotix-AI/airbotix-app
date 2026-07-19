// "Make it real" — render the composed score as an actual audio track via
// `POST /llm/music` (music-stage-prd.md §2 step ⑥, D-MS-REAL).
//
// The Stage is the ONE music surface: the score layer (notes played by the
// browser's sampler, /llm/music-score) and the real-audio layer (a generated
// song from the audio provider — ElevenLabs / Suno / the DeepRouter gateway,
// audio-ai-providers-prd.md) are two steps of one flow, not two products. This
// module is the second step; the retired Create-hub "Music Maker" page was the
// only place it used to live.
//
// The backend attaches the generated audio to the kid's active learning session
// as an assistant message with an audio Artifact, which is exactly what the
// Stage's track list already renders — so no new plumbing, just the call.

import { api } from '@/lib/api';
import { isInstrumentAudible, type MixSnapshot } from './offlineRender';
import type { MusicScore } from './scoreTypes';

/** 🎧 bills as its OWN model (owner pricing ladder 2026-07-17): real audio via
 *  ElevenLabs/Suno costs an order of magnitude more upstream than the 5⭐
 *  score call. Display/gate only — the backend `music-real` row charges. */
export const REAL_SONG_MODEL_ID = 'music-real';
export const REAL_SONG_COST_STARS = 15;

/** Upstream bound (ElevenLabs /v1/music clamps at 600s; kids never need that). */
const MAX_SECONDS = 120;
const SECONDS_PER_BEAT = 60;

export interface RealSongResult {
  id: string;
  url: string;
  mime_type: string;
  stars_charged: number;
  balance_after: number;
  /** The project the audio was persisted under — reused by a second recording. */
  project_id: string;
}

export interface RealSongArgs {
  score: MusicScore;
  /** The kid's own words from the composer bar, if they typed any. */
  topic?: string | null;
  /** Attach the song to a class when the kid came via "create for class". */
  classId?: string | null;
  /** Reuse the project a previous Save / recording already minted for this song. */
  projectId?: string | null;
  /** Stage mixer state — part of the arrangement the provider must respect (§3-B). */
  mix?: MixSnapshot;
}

/**
 * The backend persists a generated audio Artifact ONLY when the request names a
 * project (`runMedia`: no project_id → no Artifact row). A free-play Stage session
 * has no project, so recording without minting one first would hand the kid a song
 * that vanishes on reload and never appears in the Mixer or My Works. So: mint the
 * project (once per song), then generate into it.
 */
async function ensureSongProject(args: RealSongArgs): Promise<string> {
  if (args.projectId) return args.projectId;

  const project = await api<{ id: string }>('/projects', {
    method: 'POST',
    body: {
      title: (args.score.title.trim() || 'My Song').slice(0, 120),
      product_line: 'line_a_creative',
    },
  });
  if (args.classId) {
    await api(`/projects/${project.id}/placement`, {
      method: 'PATCH',
      body: { action: 'use_for_class', class_id: args.classId },
    });
  }
  return project.id;
}

/** VOL below this reads as a deliberate "keep it quiet" decision. */
export const MIX_QUIET_MAX = 0.4;
/** VOL at/above this (slider default is 0.85) reads as "make it stand out". */
export const MIX_PROMINENT_MIN = 0.98;

/**
 * Turn the score the kid ALREADY has into a prompt for the audio provider.
 *
 * The kid has spent turns on this song — title, genre, tempo, key, instruments
 * are all decided. Asking them to re-describe it in a second free-text box (what
 * the old Music Maker did) throws that away and invites a mismatch between the
 * song they hear on the stage and the song they get back. So the prompt is
 * DERIVED from the score, with their own wording carried along as the topic.
 *
 * The stage MIX is part of that arrangement (track-editing PRD §3-B): muted /
 * style=None instruments leave the featuring list entirely, a solo becomes
 * "featuring mainly …", and deliberate volume extremes translate into
 * quiet/prominent wording. Without `mix` (legacy callers/tests) the prompt
 * lists every score instrument, as before.
 */
export function buildRealSongPrompt(score: MusicScore, topic?: string, mix?: MixSnapshot): string {
  const all = [...new Set(score.tracks.map((t) => t.instrument))];
  const audible = mix ? all.filter((i) => isInstrumentAudible(i, mix)) : all;
  const wordFor = (instrument: string): string => {
    const vol = mix?.volumes[instrument];
    if (vol !== undefined && vol <= MIX_QUIET_MAX) return `quiet ${instrument}`;
    if (vol !== undefined && vol >= MIX_PROMINENT_MIN) return `prominent ${instrument}`;
    return instrument;
  };
  const featuring =
    audible.length === 0
      ? ''
      : mix?.solo !== null && mix?.solo !== undefined
        ? `featuring mainly the ${mix.solo}`
        : `featuring ${audible.map(wordFor).join(', ')}`;
  const parts = [
    topic?.trim() || score.title,
    // `genre` is optional on the score — never emit "undefined style".
    score.genre && `${score.genre} style`,
    `${score.tempo} BPM`,
    `key of ${score.key}`,
    featuring,
  ].filter(Boolean);
  return parts.join(', ');
}

/**
 * Score length in seconds, so the real track is as long as the song the kid
 * actually wrote. Length is the LAST note's beat position (+1 beat to let it
 * ring), NOT the note COUNT — a dense 16-note bar and a sparse 4-note bar of the
 * same width are the same number of seconds.
 */
export function realSongSeconds(score: MusicScore): number {
  const lastBeat = Math.max(0, ...score.tracks.flatMap((t) => t.notes.map((n) => n.time)));
  const seconds = Math.round(((lastBeat + 1) / score.tempo) * SECONDS_PER_BEAT);
  return Math.min(Math.max(seconds, 1), MAX_SECONDS);
}

export async function generateRealSong(args: RealSongArgs): Promise<RealSongResult> {
  const { score, topic, mix } = args;
  const project_id = await ensureSongProject(args);

  const result = await api<Omit<RealSongResult, 'project_id'>>('/llm/music', {
    method: 'POST',
    body: {
      model: REAL_SONG_MODEL_ID,
      prompt: buildRealSongPrompt(score, topic ?? undefined, mix),
      project_id,
      options: {
        genre: score.genre,
        duration: realSongSeconds(score),
      },
    },
  });
  return { ...result, project_id };
}
