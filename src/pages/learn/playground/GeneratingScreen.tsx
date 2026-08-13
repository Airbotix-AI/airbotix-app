// GeneratingScreen — the "building your game" screen shown between the landing
// prompt and the workspace. TOTAL REDESIGN around REAL progress: the initial AI
// turn streams (`streamAgentTurn`), and the backend now emits a `file` event the
// instant the model starts writing each file, so we reveal files one-by-one as
// they're actually generated — no fake timed bar.
//
// Three honest phases:
//   - 'thinking'  — the turn is running but no file has streamed yet. There is
//                   genuinely nothing real to show, so we play a fun, looping
//                   platformer "build scene" + rotating kid build-tips.
//   - 'building'  — files are streaming in; each one slides into a live list and
//                   the progress reflects the real file count.
//   - 'done'      — the turn resolved; a short celebratory beat shows the AI's
//                   (moderated) reply, then we hand off to the workspace.
//
// It owns NO product logic beyond firing the turn once: on resolve it hands the
// finished VFS to `onDone`. For a real project the backend is the source of truth
// (no scaffold fallback for a *load*); if the first turn fails we fall back to the
// seeded template so the kid is never trapped on this screen. A project-less
// session (no projectId) just loads the local scaffold.
//
// D-WEB-17 (neutral-first): on the GENERIC landing this screen mounts the SAME
// tick as the submit, in `creating` mode with `kind='neutral'` — a kind-agnostic
// stage + copy while the SERVER is still routing game-vs-website (D-WEB-11). It
// fires nothing until the create resolves; the neutral stage then crossfades into
// the kind stage in place. Explicit-kind flows never see the neutral stage.

import { Check, FileCode2, Gamepad2, Globe, Lightbulb, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './playground.css';
import { ApiError } from '@/lib/api';
import { useDemoMode } from '@/pages/try/demoMode';

import {
  streamAgentTurn,
  type FileNote,
  type NextStep,
  type TurnEvent,
  type VfsFile,
} from '../code/codeApi';
import type { FirstTurnSeed } from './panes/useGameAgent';
import { resolveProjectFiles } from './panes/playgroundApi';
import { SCAFFOLD_DELAY_MS } from './panes/starterProject';

/** Map a VFS path to a short friendly file label for the activity list. */
const fileLabel = (path: string) => path.split('/').pop() || path;

// Cosmetic, kid-framed flavor lines that rotate during the wait. They are clearly
// FLAVOR (the real progress is the streamed file list) — they just make the gap
// before the first file fun to read instead of a frozen spinner.
const BUILD_TIPS = [
  'Sketching your game world…',
  'Teaching the sprites how to move…',
  'Picking fun colors and shapes…',
  'Adding bounce, gravity and jumps…',
  'Wiring up the controls…',
  'Hiding a few little surprises…',
] as const;

// Website Studio flavor lines (kind='website') — same rotation mechanics.
const SITE_BUILD_TIPS = [
  'Sketching your pages…',
  'Laying out the home page…',
  'Picking fun colors and fonts…',
  'Wiring up the little backend…',
  'Filling in the starting data…',
  'Linking the pages together…',
] as const;

// Kind-NEUTRAL flavor lines (D-WEB-17) — shown on the GENERIC landing while the
// SERVER is still routing game-vs-website (D-WEB-11), so no line may say either word.
const NEUTRAL_TIPS = [
  'Figuring out the perfect way to build your idea…',
  'Reading your idea closely…',
  'Warming up the studio…',
  'Gathering colors, shapes and sounds…',
  'Setting up the workbench…',
  'Sharpening the crayons…',
] as const;

const TIP_MS = 2400;
// A short celebratory beat on the finished build before we open the studio — long
// enough to feel like a payoff after a 20–30s wait, short enough to not annoy.
const DONE_BEAT_MS = 850;
// D-WEB-17: how long the outgoing NEUTRAL stage lingers (fading out over the
// incoming kind stage) when the server's game-vs-website routing arrives. Keep in
// sync with `.pg-stage-fade` in playground.css (0.4s).
const STAGE_FADE_MS = 400;
// gpt-4o-mini's parallel function-calling delivers every file in a burst at the
// END of generation (it streams its narration first, then all tool calls at once),
// so there's no safe per-file signal mid-generation. The files ARE real — we just
// reveal them one-by-one on this cadence so the "building" phase reads as a live
// build instead of an instant dump. Honest pacing, not fake progress.
const REVEAL_MS = 260;
// Try-demo only: the scripted build's honest "thinking" beat before its (bundled,
// instantly-available) files start revealing — the same thinking → building →
// done arc a real streamed first turn plays, just on a fixed clock.
const DEMO_THINK_MS = 1100;

type Status = 'thinking' | 'building' | 'done';

/** What the reveal interval needs from a finished build — a real streamed turn,
 *  or the try-demo's scripted equivalent — to play the done beat + hand off. */
interface FinishedBuild {
  files: VfsFile[];
  summary: string;
  tools_fired?: string[];
  next_steps?: NextStep[];
  file_notes?: FileNote[];
}

export function GeneratingScreen({
  prompt,
  name,
  projectId,
  mode = 'lite',
  kind = 'game',
  creating = false,
  onDone,
  onError,
}: {
  prompt: string;
  /** Website Studio builds say "website", not "game" (D-WEB-11). `neutral`
   *  (D-WEB-17) = the GENERIC landing while the SERVER is still routing
   *  game-vs-website — kind-agnostic stage + copy, morphs when the kind lands. */
  kind?: 'game' | 'website' | 'neutral';
  /** D-WEB-17: the backend project create (which may spend seconds classifying
   *  game-vs-website server-side) is still in flight — render the wait UI but
   *  fire nothing; the effect re-runs with the real `projectId` once it lands. */
  creating?: boolean;
  /** The kid's game name (PRD J1) — labels the local scaffold when no backend. */
  name?: string;
  /** When set, the real project files are loaded from the backend (S3-backed). */
  projectId?: string;
  /** Age tier for the first-turn generation (Lite 8–11 / Pro 12–17). */
  mode?: 'lite' | 'pro';
  /** `firstTurn` is set when a brand-new game was generated by the AI here.
   *  `blocked` is set when the build was refused by the safety check (the kid lands
   *  in the empty scaffold with a friendly explanation + gentler suggestions). */
  onDone: (files: VfsFile[], firstTurn?: FirstTurnSeed, blocked?: boolean) => void;
  /**
   * The build couldn't complete and there's no usable fallback — the caller shows
   * an error page. `kind` distinguishes WHY: `'load'` = the real project's files
   * couldn't be loaded; `'service'` = the AI/safety service was unavailable (an
   * outage or an unconfigured LLM provider — `SAFETY_UNAVAILABLE`), which is a
   * general "try again later" error, NOT a content refusal (those open the
   * workspace with a gentle deflection via `onDone(..., blocked)`).
   */
  onError?: (kind: 'load' | 'service') => void;
}) {
  const [status, setStatus] = useState<Status>('thinking');
  // Live activity from the stream — the files the AI is writing, in order.
  const [built, setBuilt] = useState<string[]>([]);
  // The AI's (moderated) reply — arrives at the end of generation.
  // Rotating flavor-tip index.
  const [tip, setTip] = useState(0);
  const tips = kind === 'website' ? SITE_BUILD_TIPS : kind === 'neutral' ? NEUTRAL_TIPS : BUILD_TIPS;
  // Keep the latest callbacks without re-running the mount effect.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  // The first-turn generation, fired ONCE — a ref-guarded promise so React 18
  // StrictMode's double-invoke (and any re-render) can't run/charge two turns.
  const turnRef = useRef<ReturnType<typeof streamAgentTurn> | null>(null);
  // Files stream in a burst at the end; queue them and reveal one-at-a-time (see
  // REVEAL_MS). `seen` de-dups (the backend emits each path twice — streamed +
  // collected). `result` holds the resolved turn until the queue has drained, so
  // the kid watches every file build up before the "ready!" beat.
  const queueRef = useRef<string[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const resultRef = useRef<FinishedBuild | null>(null);
  const phaseRef = useRef<Status>('thinking');

  // Try-demo seam (try-demo-mode-prd §3 step 1→2): the public demo has no
  // backend, so its scripted first build feeds the SAME reveal pipeline a real
  // streamed turn drives. Null everywhere else — behaviour identical outside /try.
  const demo = useDemoMode();

  // Building = a NEW game from a typed prompt → the full build experience.
  // Resuming an existing project has no prompt → load only, no build phase.
  const building = prompt.trim().length > 0;
  // A real new game → the AI generates it here (not a template load).
  const aiBuild = building && !!projectId;
  // A demo build: the bundled starter "streams" through the real progress UI.
  const demoBuild = building && !aiBuild && !!demo;

  // D-WEB-17: when the GENERIC landing's server-side routing lands, the neutral
  // stage morphs into the kind stage as a CSS crossfade — the outgoing neutral
  // stage lingers absolutely on top, fading out, so there's no unmount flash.
  const [neutralGhost, setNeutralGhost] = useState(false);
  const prevKindRef = useRef(kind);
  useEffect(() => {
    const was = prevKindRef.current;
    prevKindRef.current = kind;
    if (was !== 'neutral' || kind === 'neutral') return undefined;
    setNeutralGhost(true);
    const t = window.setTimeout(() => setNeutralGhost(false), STAGE_FADE_MS);
    return () => window.clearTimeout(t);
  }, [kind]);

  useEffect(() => {
    let cancelled = false;
    let doneTimer = 0;
    // Rotate the flavor tips for the whole wait (cleared on handoff).
    const tipTimer = window.setInterval(() => setTip((t) => (t + 1) % BUILD_TIPS.length), TIP_MS);

    // D-WEB-17: the backend project is still being CREATED (the server may be
    // classifying game-vs-website) — there is nothing to stream or load yet.
    // Keep the tips rotating; the effect re-runs with the real projectId (and
    // the routed kind) the moment the create resolves.
    if (creating) {
      return () => {
        cancelled = true;
        window.clearInterval(tipTimer);
      };
    }

    const finish = (files: VfsFile[], firstTurn?: FirstTurnSeed, blocked?: boolean) => {
      if (cancelled) return;
      window.clearInterval(tipTimer);
      onDoneRef.current(files, firstTurn, blocked);
    };

    // ── NEW GAME on a real project: the AI builds it HERE and we stream its
    //    progress. The turn auto-applies + persists the VFS server-side, so
    //    `result.files` is the finished game and `result.summary` is the reply.
    //    A DEMO build shares the exact same reveal pipeline — only the source
    //    differs (the bundled starter + canned reply instead of the stream). ──
    if (aiBuild || demoBuild) {
      // Reveal queued files one-at-a-time, then (once drained AND the turn has
      // resolved) transition to the celebratory done beat. A single interval owns
      // both so the order is deterministic regardless of StrictMode re-mounts.
      const reveal = window.setInterval(() => {
        if (queueRef.current.length) {
          const label = queueRef.current.shift()!;
          setBuilt((b) => [...b, label]);
          if (phaseRef.current === 'thinking') {
            phaseRef.current = 'building';
            setStatus('building');
          }
          return;
        }
        if (resultRef.current && phaseRef.current !== 'done') {
          const r = resultRef.current;
          phaseRef.current = 'done';
          setStatus('done');
          window.clearInterval(reveal);
          window.clearInterval(tipTimer);
          doneTimer = window.setTimeout(
            () =>
              finish(r.files, {
                prompt,
                reply: r.summary,
                toolsFired: r.tools_fired,
                nextSteps: r.next_steps,
                fileNotes: r.file_notes,
              }),
            DONE_BEAT_MS,
          );
        }
      }, REVEAL_MS);

      // ── Demo build: after an honest thinking beat, queue the bundled starter's
      //    files into the same reveal queue and hand the canned reply to the
      //    interval — thinking → building (file-by-file) → done, like the real thing.
      if (demoBuild) {
        let demoTimer = 0;
        void resolveProjectFiles({ prompt }).then((files) => {
          if (cancelled) return;
          demoTimer = window.setTimeout(() => {
            for (const f of files) {
              const label = fileLabel(f.path);
              if (seenRef.current.has(label)) continue;
              seenRef.current.add(label);
              queueRef.current.push(label);
            }
            const summary = demo?.firstTurnReply ?? '';
            resultRef.current = {
              files,
              summary,
              tools_fired: files.map((f) => `write_file:${f.path}`),
            };
          }, DEMO_THINK_MS);
        });
        return () => {
          cancelled = true;
          window.clearInterval(reveal);
          window.clearInterval(tipTimer);
          window.clearTimeout(demoTimer);
          if (doneTimer) window.clearTimeout(doneTimer);
        };
      }

      if (!turnRef.current) {
        turnRef.current = streamAgentTurn(
          { projectId: projectId!, prompt, mode: modeRef.current },
          (e: TurnEvent) => {
            if (e.type === 'file') {
              const label = fileLabel(e.path);
              if (seenRef.current.has(label)) return;
              seenRef.current.add(label);
              queueRef.current.push(label);
            }
            // The AI's reply is taken from the resolved `result.summary` (it
            // seeds the first chat message); the streamed `summary` event needs
            // no handling here.
          },
        );
      }
      turnRef.current
        .then((result) => {
          if (cancelled) return;
          // Hand to the reveal interval — it shows the done beat once files drain.
          resultRef.current = result;
        })
        .catch(async (turnErr: unknown) => {
          // The first turn failed (e.g. out of Stars, or the safety check refused
          // the idea) — never trap the kid here; fall back to the seeded template so
          // the studio still opens. A MODERATION block is flagged so the workspace
          // can explain it + offer gentler ideas instead of a silent empty project.
          if (cancelled) return;
          window.clearInterval(reveal);
          // The safety/AI service couldn't run (outage or unconfigured LLM,
          // SAFETY_UNAVAILABLE) — this is NOT a content refusal, so don't open the
          // workspace with the "too rough" deflection; show a general error page.
          if (turnErr instanceof ApiError && turnErr.code === 'SAFETY_UNAVAILABLE') {
            window.clearInterval(tipTimer);
            onErrorRef.current?.('service');
            return;
          }
          const blocked = turnErr instanceof ApiError && turnErr.code === 'MODERATION_REJECTED';
          try {
            finish(await resolveProjectFiles({ projectId, prompt, name }), undefined, blocked);
          } catch {
            if (cancelled) return;
            window.clearInterval(tipTimer);
            onErrorRef.current?.('load');
          }
        });

      return () => {
        cancelled = true;
        window.clearInterval(reveal);
        window.clearInterval(tipTimer);
        if (doneTimer) window.clearTimeout(doneTimer);
      };
    }

    // ── RESUME / project-less session: just load the saved/scaffold VFS (no AI
    //    turn). Keep a minimum on-screen time for a typed prompt so it doesn't flash. ──
    const startedAt = Date.now();
    resolveProjectFiles({ projectId, prompt, name })
      .then((files) => {
        if (cancelled) return;
        const remaining = building ? Math.max(0, SCAFFOLD_DELAY_MS - (Date.now() - startedAt)) : 0;
        doneTimer = window.setTimeout(() => finish(files), remaining);
      })
      .catch((err) => {
        if (cancelled) return;
        window.clearInterval(tipTimer);
        onErrorRef.current?.(err);
      });

    return () => {
      cancelled = true;
      window.clearInterval(tipTimer);
      if (doneTimer) window.clearTimeout(doneTimer);
    };
  }, [prompt, name, projectId, building, aiBuild, demoBuild, demo, creating]);

  return (
    <div
      data-testid="generating-screen"
      className="pg-canvas fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 px-6 text-pg-text"
    >
      {/* Prompt echo — the kid's request, only while BUILDING a new game. */}
      {building && (
        <p className="max-w-2xl text-center text-xl italic text-pg-text-dim">“{prompt}”</p>
      )}

      {/* The playful build stage — loops while waiting, celebrates when done. On
          the generic landing it opens KIND-NEUTRAL and crossfades into the real
          stage when the server's game-vs-website routing arrives (D-WEB-17). */}
      <div className="relative">
        {kind === 'website' ? (
          <SiteBuildStage done={status === 'done'} />
        ) : kind === 'game' ? (
          <BuildStage done={status === 'done'} />
        ) : (
          <NeutralStage />
        )}
        {neutralGhost && kind !== 'neutral' && (
          <div className="pg-stage-fade pointer-events-none absolute inset-0">
            <NeutralStage ghost />
          </div>
        )}
      </div>

      {/* Status block: thinking spinner → live file list → ready reveal. */}
      <div className="flex w-[min(440px,86vw)] flex-col gap-3">
        {status === 'done' ? (
          <ReadyReveal kind={kind === 'website' ? 'website' : 'game'} />
        ) : aiBuild || demoBuild || creating ? (
          <ActivityList built={built} tip={tips[tip % tips.length]} kind={kind} status={status} />
        ) : (
          <SimpleLoading
            label={
              projectId
                ? kind === 'website'
                  ? 'Loading your website…'
                  : 'Loading your game…'
                : kind === 'website'
                  ? 'Building your website…'
                  : kind === 'neutral'
                    ? 'Warming up the studio…'
                    : 'Building your game…'
            }
            tip={tips[tip % tips.length]}
          />
        )}
      </div>
    </div>
  );
}

/** The live, REAL file list (or the thinking spinner before the first file). */
function ActivityList({
  built,
  tip,
  kind,
  status,
}: {
  built: string[];
  tip: string;
  kind: 'game' | 'website' | 'neutral';
  status: Status;
}) {
  // While the kind is still being decided (D-WEB-17) the heading stays NEUTRAL —
  // no "game" or "website" until the server's routing arrives.
  const heading =
    kind === 'neutral'
      ? 'Warming up the studio…'
      : built.length === 0
        ? `Dreaming up your ${kind}…`
        : `Building your ${kind}`;
  return (
    <>
      <div className="flex items-center gap-2 text-[15px] font-semibold text-pg-text-dim">
        <Wand2 size={16} className="text-brand-bubblegum" />
        {heading}
      </div>

      {built.length === 0 ? (
        <div className="flex items-center gap-3 text-[16px] text-pg-text-muted">
          <Loader2 size={18} className="animate-spin text-brand-sky" />
          <span key={tip} className="pg-thinking-line">
            {tip}
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {built.map((label) => (
            <li
              key={label}
              className="pg-file-in flex items-center gap-3 text-[16px] text-pg-text-dim"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-mint/15 text-brand-mint">
                <Check size={14} strokeWidth={3} />
              </span>
              <FileCode2 size={15} className="text-pg-text-muted" />
              <span className="font-medium">{label}</span>
            </li>
          ))}
        </ul>
      )}

      <ProgressBar status={status} count={built.length} />
    </>
  );
}

/** The resume / project-less loading view (no real file stream to show). */
function SimpleLoading({ label, tip }: { label: string; tip: string }) {
  return (
    <>
      <div className="flex items-center gap-3 text-[16px] text-pg-text-muted">
        <Loader2 size={18} className="animate-spin text-brand-sky" />
        {label}
      </div>
      <span key={tip} className="pg-thinking-line text-sm text-pg-text-muted">
        {tip}
      </span>
      <ProgressBar status="thinking" count={0} />
    </>
  );
}

/** Honest progress: an indeterminate L→R sweep while waiting (no real % to show
 *  yet — the build lands in a burst at the end), then a determinate fill that
 *  grows with each revealed file and tops out at 100% on done. */
function ProgressBar({ status, count }: { status: Status; count: number }) {
  const fill = 'h-full rounded-full bg-gradient-to-r from-brand-coral via-brand-bubblegum to-brand-mint';
  return (
    <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-pg-text/10">
      {status === 'thinking' && count === 0 ? (
        <div className={`pg-indeterminate absolute inset-y-0 left-0 w-1/3 ${fill}`} />
      ) : (
        <div
          className={`${fill} transition-all duration-500`}
          style={{ width: status === 'done' ? '100%' : `${Math.min(92, 28 + count * 12)}%` }}
        />
      )}
    </div>
  );
}

/** The celebratory done state — just the flourish. The AI's full reply is NOT
 *  repeated here (owner feedback 2026-08-13: a long model reply read as a wall
 *  of text under the headline) — it lands as the AI's first message in the chat
 *  window, its real home, a moment later. */
function ReadyReveal({ kind }: { kind: 'game' | 'website' }) {
  return (
    <div className="pg-pop flex flex-col items-center gap-3 text-center">
      <div className="flex items-center gap-2 text-lg font-extrabold text-pg-text">
        <Gamepad2 size={22} className="text-brand-mint" />
        {kind === 'website' ? 'Your website is ready!' : 'Your game is ready!'}
      </div>
    </div>
  );
}

// ── The fun, looping platformer "build stage" (pure CSS, see playground.css §5).
// A little hero hops across bobbing platforms under a soft sky while sparkles
// twinkle. On `done` it dims and a game-pad celebration pops in. Decorative only.
function BuildStage({ done }: { done: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid="build-stage-game"
      className="relative h-52 w-[min(440px,86vw)] overflow-hidden rounded-[1.75rem] border border-pg-border bg-gradient-to-b from-brand-sky/20 via-brand-bubblegum/5 to-brand-mint/25 shadow-lg"
    >
      {/* Clouds */}
      <span className="pg-bob absolute left-8 top-6 h-4 w-10 rounded-full bg-white/70" />
      <span
        className="pg-bob absolute right-10 top-10 h-3 w-8 rounded-full bg-white/60"
        style={{ animationDelay: '0.8s' }}
      />
      {/* Sparkles */}
      <Sparkles
        size={16}
        className="pg-twinkle absolute left-12 top-14 text-brand-sunshine"
      />
      <Sparkles
        size={12}
        className="pg-twinkle absolute right-16 top-20 text-brand-bubblegum"
        style={{ animationDelay: '0.6s' }}
      />
      <Sparkles
        size={14}
        className="pg-twinkle absolute right-24 top-8 text-brand-sky"
        style={{ animationDelay: '1.1s' }}
      />

      {/* Platforms (the "jump across platforms" motif). */}
      <span className="pg-bob absolute bottom-12 left-[14%] h-2.5 w-16 rounded-full bg-brand-mint/70" />
      <span
        className="pg-bob absolute bottom-20 left-[42%] h-2.5 w-16 rounded-full bg-brand-mint/70"
        style={{ animationDelay: '0.5s' }}
      />
      <span
        className="pg-bob absolute bottom-12 left-[70%] h-2.5 w-16 rounded-full bg-brand-mint/70"
        style={{ animationDelay: '1s' }}
      />

      {/* Hero — hops continuously while running left↔right. */}
      <div className="pg-hero absolute bottom-[4.2rem]">
        <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-brand-coral shadow-md">
          <span className="absolute left-2 top-2.5 h-1.5 w-1.5 rounded-full bg-white" />
          <span className="absolute right-2 top-2.5 h-1.5 w-1.5 rounded-full bg-white" />
        </div>
      </div>

      {/* Ground. */}
      <div className="absolute bottom-0 left-0 h-8 w-full bg-brand-mint/30" />

      {/* Done celebration overlay. */}
      {done && (
        <div className="absolute inset-0 grid place-items-center bg-pg-bg/70 backdrop-blur-[1px]">
          <div className="pg-pop grid h-20 w-20 place-items-center rounded-full bg-brand-sky/20">
            <Gamepad2 size={40} className="text-brand-sky" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── The website "build stage" sibling (D-WEB-11/12 — same pure-CSS primitives):
// a little browser window assembles itself — chrome bar, then a heading, text
// lines and two content cards pulse in while sparkles twinkle. On `done` it
// dims and a globe celebration pops in. Decorative only.
function SiteBuildStage({ done }: { done: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid="build-stage-website"
      className="relative h-52 w-[min(440px,86vw)] overflow-hidden rounded-[1.75rem] border border-pg-border bg-gradient-to-b from-brand-sky/20 via-brand-bubblegum/5 to-brand-mint/25 shadow-lg"
    >
      {/* Sparkles (shared motif). */}
      <Sparkles size={16} className="pg-twinkle absolute left-8 top-8 text-brand-sunshine" />
      <Sparkles
        size={12}
        className="pg-twinkle absolute right-10 top-16 text-brand-bubblegum"
        style={{ animationDelay: '0.6s' }}
      />
      <Sparkles
        size={14}
        className="pg-twinkle absolute right-16 top-6 text-brand-sky"
        style={{ animationDelay: '1.1s' }}
      />

      {/* The little browser window being assembled. */}
      <div className="pg-bob absolute left-1/2 top-1/2 h-36 w-[68%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-pg-border bg-white/85 shadow-md">
        {/* Chrome bar: window dots + an address pill with a tiny globe. */}
        <div className="flex items-center gap-1.5 border-b border-pg-border/60 bg-pg-desktop/60 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-brand-coral/80" />
          <span className="h-2 w-2 rounded-full bg-brand-sunshine/80" />
          <span className="h-2 w-2 rounded-full bg-brand-mint/80" />
          <span className="ml-2 flex h-4 flex-1 items-center gap-1 rounded-full bg-white/80 px-2">
            <Globe size={9} className="shrink-0 text-brand-sky" />
            <span className="h-1 w-16 rounded-full bg-brand-sky/30" />
          </span>
        </div>
        {/* Page skeleton assembling: heading → text lines → two cards, pulsing in. */}
        <div className="space-y-2 p-3">
          <span className="block h-3 w-1/2 animate-pulse rounded-full bg-brand-sky/50" />
          <span
            className="block h-2 w-4/5 animate-pulse rounded-full bg-pg-border"
            style={{ animationDelay: '0.3s' }}
          />
          <span
            className="block h-2 w-2/3 animate-pulse rounded-full bg-pg-border"
            style={{ animationDelay: '0.6s' }}
          />
          <div className="flex gap-2 pt-1">
            <span
              className="h-10 flex-1 animate-pulse rounded-xl bg-brand-mint/40"
              style={{ animationDelay: '0.9s' }}
            />
            <span
              className="h-10 flex-1 animate-pulse rounded-xl bg-brand-bubblegum/30"
              style={{ animationDelay: '1.2s' }}
            />
          </div>
        </div>
      </div>

      {/* Done celebration overlay. */}
      {done && (
        <div className="absolute inset-0 grid place-items-center bg-pg-bg/70 backdrop-blur-[1px]">
          <div className="pg-pop grid h-20 w-20 place-items-center rounded-full bg-brand-mint/20">
            <Globe size={40} className="text-brand-mint" />
          </div>
        </div>
      )}
    </div>
  );
}

// ── The kind-NEUTRAL stage (D-WEB-17): the generic landing shows this the instant
// the kid submits, while the SERVER is still routing game-vs-website (D-WEB-11) —
// so nothing on it may hint at either. A pulsing idea-spark (lightbulb in soft
// breathing rings) + the shared sparkle motif — same pure-CSS primitives and outer
// frame as its siblings so the crossfade into them is seamless. Decorative only.
// The `ghost` render is the fading morph copy: it drops the testid so only ONE
// live neutral stage is ever addressable.
function NeutralStage({ ghost = false }: { ghost?: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-testid={ghost ? undefined : 'build-stage-neutral'}
      className="relative h-52 w-[min(440px,86vw)] overflow-hidden rounded-[1.75rem] border border-pg-border bg-gradient-to-b from-brand-sky/20 via-brand-bubblegum/5 to-brand-mint/25 shadow-lg"
    >
      {/* Sparkles (shared motif). */}
      <Sparkles size={16} className="pg-twinkle absolute left-10 top-9 text-brand-sunshine" />
      <Sparkles
        size={12}
        className="pg-twinkle absolute right-12 top-16 text-brand-bubblegum"
        style={{ animationDelay: '0.6s' }}
      />
      <Sparkles
        size={14}
        className="pg-twinkle absolute right-20 top-7 text-brand-sky"
        style={{ animationDelay: '1.1s' }}
      />
      <Sparkles
        size={12}
        className="pg-twinkle absolute bottom-10 left-16 text-brand-mint"
        style={{ animationDelay: '1.5s' }}
      />

      {/* The pulsing idea spark: a lightbulb inside soft breathing rings. */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute -inset-6 animate-pulse rounded-full bg-brand-sunshine/10" />
        <span
          className="absolute -inset-3 animate-pulse rounded-full bg-brand-sunshine/15"
          style={{ animationDelay: '0.5s' }}
        />
        <div className="pg-bob relative grid h-20 w-20 place-items-center rounded-full bg-brand-sunshine/25 shadow-md">
          <Lightbulb size={36} className="text-brand-sunshine" />
        </div>
      </div>

      {/* Little thought-dots drifting up toward the spark. */}
      <span className="pg-bob absolute bottom-9 left-[28%] h-2.5 w-2.5 rounded-full bg-brand-sky/60" />
      <span
        className="pg-bob absolute bottom-12 left-[64%] h-2 w-2 rounded-full bg-brand-bubblegum/60"
        style={{ animationDelay: '0.7s' }}
      />
      <span
        className="pg-bob absolute bottom-7 left-[48%] h-1.5 w-1.5 rounded-full bg-brand-mint/70"
        style={{ animationDelay: '1.2s' }}
      />
    </div>
  );
}
