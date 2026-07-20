// Typed client for `POST /llm/music-score` (music-workspace-tech-spec §5.2,
// music-stage-prd §3.4). Suggestion-card iterations reuse the same endpoint
// with `existingScore` + a structured `modifier` key — no new endpoints.
// Save-to-My-Works (PRD §2 step ⑤) also lives here: it composes EXISTING
// project/artifact endpoints, mirroring the backend's own score persistence.

import { api } from '@/lib/api';
import type { SeedScore } from './riffPad';
import type { MusicScore } from './scoreTypes';
import type { SuggestionKey } from './stageData';

/** Matches the backend's score-artifact mime (llm.service musicScore persist). */
export const SCORE_MIME_TYPE = 'application/vnd.airbotix.score+json';

export interface MusicScoreOptions {
  genre?: string;
  mood?: string;
  duration?: number;
  instruments?: string[];
}

export interface MusicScoreRequest {
  /** 1–800 chars, firewall-checked server-side. */
  prompt: string;
  options?: MusicScoreOptions;
  /** Current score when iterating — the LLM keeps untouched tracks stable. */
  existingScore?: MusicScore;
  /** Riff Pad seed (§5A D-MS11): the kid's own motif; the finished lead melody
   *  must contain it verbatim (backend system-prompt rule + mock anchor). */
  seedScore?: SeedScore;
  /** Suggestion-card key (structured, never free text). */
  modifier?: SuggestionKey;
  /** Lane 🔄: regenerate ONLY this instrument's track (backend prompt builder
   *  emits the structured instruction; track-editing PRD §3-A). */
  rerollTrack?: string;
  /**
   * 0⭐ instrument-style switches accumulated since the previous generation —
   * the kid's iteration profile for the parent-visible audit event
   * (music-stage-prd §8). Counted client-side, reset after each success.
   */
  style_changes?: number;
}

export interface MusicScoreResult {
  /** The validated score, returned inline. The backend ALSO persists it on the
   *  session message (`metadata.score`), which is what the Stage renders after
   *  the messages query refetches — the persisted read-back, not this echo. */
  score: MusicScore;
  stars_charged: number;
  balance_after: number;
  artifact_id: string | null;
  session_id: string | null;
}

export function generateMusicScore(req: MusicScoreRequest): Promise<MusicScoreResult> {
  return api<MusicScoreResult>('/llm/music-score', {
    method: 'POST',
    body: {
      prompt: req.prompt,
      options: req.options,
      existingScore: req.existingScore,
      seedScore: req.seedScore,
      modifier: req.modifier,
      rerollTrack: req.rerollTrack,
      style_changes: req.style_changes,
    },
  });
}

/** Shape of `POST /projects/:id/artifacts/upload-url` (artifacts.service). */
interface SignedUpload {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  s3_key: string;
}

export interface SaveScoreResult {
  project_id: string;
  artifact_id: string;
}

/**
 * Promote the current score version into the kid's My Works (PRD §2 step ⑤):
 * create a creative project titled after the song, then persist the score
 * JSON through the existing upload-url → S3 PUT → register-artifact flow.
 * The registered metadata mirrors what the backend writes for project-scoped
 * generations (inline `score` + summary fields), so ProjectDetailPage and the
 * Stage's artifact fallback read one canonical shape. A failed S3 PUT still
 * registers the artifact with `upload_failed` — the inline score is the
 * render source, exactly like the backend's own resilience path.
 */
export async function saveScoreToMyWorks(
  score: MusicScore,
  /** Set when the kid reached the Stage from a class ("create for class") — the
   *  Stage owns no project until Save, so the class placement happens HERE or the
   *  song never becomes teacher-visible class work. */
  classId?: string | null,
): Promise<SaveScoreResult> {
  const project = await api<{ id: string }>('/projects', {
    method: 'POST',
    body: {
      title: (score.title.trim() || 'My Song').slice(0, 120),
      product_line: 'line_a_creative',
    },
  });

  if (classId) {
    await api(`/projects/${project.id}/placement`, {
      method: 'PATCH',
      body: { action: 'use_for_class', class_id: classId },
    });
  }

  const json = JSON.stringify(score, null, 2);
  const size_bytes = new TextEncoder().encode(json).length;
  const signed = await api<SignedUpload>(`/projects/${project.id}/artifacts/upload-url`, {
    method: 'POST',
    body: { kind: 'text', mime_type: SCORE_MIME_TYPE, size_bytes, filename: 'score.json' },
  });

  let upload_failed = false;
  try {
    const put = await fetch(signed.url, {
      method: signed.method,
      headers: signed.headers,
      body: json,
    });
    if (!put.ok) upload_failed = true;
  } catch {
    upload_failed = true;
  }

  const artifact = await api<{ id: string }>(`/projects/${project.id}/artifacts`, {
    method: 'POST',
    body: {
      kind: 'text',
      s3_key: signed.s3_key,
      mime_type: SCORE_MIME_TYPE,
      size_bytes,
      metadata: {
        source: 'music-score',
        title: score.title,
        tempo: score.tempo,
        key: score.key,
        instruments: score.tracks.map((t) => t.instrument),
        upload_failed,
        score,
      },
    },
  });

  return { project_id: project.id, artifact_id: artifact.id };
}
