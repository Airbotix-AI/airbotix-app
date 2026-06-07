// Teacher class-session reads + actions (learn-game-studio-prd §9 J6 + §17.12 J12).
// Every call goes through the typed `api()` client — never a raw fetch from a
// component, never a direct LLM call. The teacher principal is a `user` with
// role=teacher; the backend enforces teacher-of-class scoping on every read
// (client gates are UX-only — contract §4).

import { api } from '@/lib/api';

/** A kid's live session status on the dashboard (PRD §17.12 acceptance). */
export type KidStatus = 'running' | 'error' | 'idle' | 'share-pending';

/** One kid tile in the class dashboard. `thumbnailDataUrl` is a captured canvas
 *  frame (read-only, PII-free); absent until the kid runs their game. */
export interface KidTile {
  kidId: string;
  /** Display label — a class nickname, never real-name PII (compliance §11). */
  nickname: string;
  status: KidStatus;
  /** Raised "Ask my teacher" hand (J4 raise-hand). */
  needsHelp: boolean;
  /** When the hand was raised (ms epoch) — drives wait-time ordering (§17.17). */
  handRaisedAt: number | null;
  /** Last live thumbnail of the kid's running game, if any. */
  thumbnailDataUrl: string | null;
  /** This kid's session is currently taken over by the teacher (lock). */
  takenOver: boolean;
}

/** Lesson pacing phases (§17.16 45-min pacing tools). */
export type LessonPhase = 'warm-up' | 'build' | 'share' | 'pack-up';

/** A single event on the process/authorship timeline (§17.16, reframed from a
 *  kid-vs-AI %: "evidence of the child's process", NOT a contribution percentage). */
export interface ProcessEvent {
  id: string;
  /** Who/what drove the change — surfaced from the agent/save audit. */
  source: 'kid_edit' | 'ai_turn' | 'prediction' | 'debug';
  at: number;
  /** A short, PII-free summary (e.g. a prompt the kid wrote, a diff the AI made). */
  summary: string;
  /** Success criteria this event is tagged as evidence for (criterion ids). */
  criteria: string[];
}

/** A rubric success-criterion + its evidence-coverage state (§17.17 criterion
 *  -coverage view: a grade must be moderation-defensible). */
export interface Criterion {
  id: string;
  label: string;
  /** none = no evidence yet · suggested = auto-suggested, NOT teacher-confirmed
   *  · confirmed = teacher attached/confirmed evidence. */
  coverage: 'none' | 'suggested' | 'confirmed';
}

export interface KidAssessment {
  kidId: string;
  nickname: string;
  /** The kid's own prompt history (prompt-authoring IS student work — §17.15). */
  promptHistory: string[];
  timeline: ProcessEvent[];
  criteria: Criterion[];
}

export interface ClassDashboard {
  classId: string;
  className: string;
  phase: LessonPhase;
  /** Remaining session time in seconds (class timer); null = no timer running. */
  timerSeconds: number | null;
  frozen: boolean;
  tiles: KidTile[];
}

// ── Reads ────────────────────────────────────────────────────────────────────

export function getClassDashboard(classId: string): Promise<ClassDashboard> {
  return api<ClassDashboard>(`/teacher/classes/${classId}/dashboard`);
}

export function getKidAssessment(classId: string, kidId: string): Promise<KidAssessment> {
  return api<KidAssessment>(`/teacher/classes/${classId}/kids/${kidId}/assessment`);
}

// ── Actions ────────────────────────────────────────────────────────────────────

/** Push a one-way hint/nudge to a kid's screen (teacher→kid, NOT chat — §17.15). */
export function pushHint(classId: string, kidId: string, text: string): Promise<void> {
  return api<void>(`/teacher/classes/${classId}/kids/${kidId}/hint`, {
    method: 'POST',
    body: { text },
  });
}

/** Take the wheel in a kid's project (audited; locks the kid's editor — §17.16). */
export function takeOver(classId: string, kidId: string): Promise<void> {
  return api<void>(`/teacher/classes/${classId}/kids/${kidId}/takeover`, { method: 'POST' });
}

/** Release a take-over lock back to the kid. */
export function releaseTakeOver(classId: string, kidId: string): Promise<void> {
  return api<void>(`/teacher/classes/${classId}/kids/${kidId}/takeover`, { method: 'DELETE' });
}

/** Freeze (or unfreeze) all kid screens — "eyes on me" (§17.16). Unfreeze must
 *  preserve in-flight AI turns server-side (§17.17). */
export function setFreezeAll(classId: string, frozen: boolean): Promise<void> {
  return api<void>(`/teacher/classes/${classId}/freeze`, {
    method: 'POST',
    body: { frozen },
  });
}

/** Set the lesson phase for the class. */
export function setPhase(classId: string, phase: LessonPhase): Promise<void> {
  return api<void>(`/teacher/classes/${classId}/phase`, { method: 'POST', body: { phase } });
}
