import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { useWsEvent } from '@/lib/useWsEvent';
import { ApiError } from '@/lib/api';
import {
  getClassDashboard,
  pushHint,
  releaseTakeOver,
  setFreezeAll,
  setPhase,
  takeOver,
  type ClassDashboard,
  type KidTile,
  type LessonPhase,
} from './classApi';
import { applyFeedEvent, raisedHands, sortTiles, type ClassFeedEvent } from './classFeed';
import { KidTileCard } from './KidTileCard';

const PHASES: LessonPhase[] = ['warm-up', 'build', 'share', 'pack-up'];

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Teacher class dashboard — `/teacher/classes/:classId` (PRD §17.12 J12).
 * One tile per kid (live thumbnail + status), needs-help kids flagged to the top,
 * a wait-time-ordered raised-hands queue, pacing (timer / phase / freeze-all),
 * push-hint, and take-over. Live updates fold the per-kid WS broadcasts
 * (D-GAME5) into local tile state; the initial snapshot comes from the API.
 */
export function ClassDashboardPage() {
  const { classId } = useParams<{ classId: string }>();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const dash = useQuery<ClassDashboard>({
    queryKey: ['teacher', 'dashboard', classId],
    queryFn: () => getClassDashboard(classId!),
    enabled: !!classId,
  });

  // Live tile state: seed from the snapshot, then fold WS events over it so a
  // kid's edit/run/raised-hand updates that kid's tile without a refetch.
  const [tiles, setTiles] = useState<KidTile[]>([]);
  useEffect(() => {
    if (dash.data) setTiles(dash.data.tiles);
  }, [dash.data]);

  useWsEvent<ClassFeedEvent>(
    'class.feed',
    (ev) => setTiles((prev) => applyFeedEvent(prev, ev)),
    [classId],
  );

  // DEV-only deterministic seam for e2e (mirrors the no-auth /playground-sandbox
  // pattern): a `class-feed-test` window event injects a live feed delta without a
  // real socket.io backend. Stripped from production builds.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const onTest = (e: Event) =>
      setTiles((prev) => applyFeedEvent(prev, (e as CustomEvent<ClassFeedEvent>).detail));
    window.addEventListener('class-feed-test', onTest);
    return () => window.removeEventListener('class-feed-test', onTest);
  }, []);

  const onError = (e: unknown) =>
    setActionError(e instanceof ApiError ? e.message : 'Something went wrong.');

  const hintMut = useMutation({
    mutationFn: (kidId: string) => pushHint(classId!, kidId, 'Try the ▶ button, then ask me!'),
    onError,
  });

  const takeOverMut = useMutation({
    mutationFn: (tile: KidTile) =>
      tile.takenOver ? releaseTakeOver(classId!, tile.kidId) : takeOver(classId!, tile.kidId),
    onSuccess: (_data, tile) =>
      setTiles((prev) =>
        prev.map((t) => (t.kidId === tile.kidId ? { ...t, takenOver: !tile.takenOver } : t)),
      ),
    onError,
  });

  const freezeMut = useMutation({
    mutationFn: (frozen: boolean) => setFreezeAll(classId!, frozen),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher', 'dashboard', classId] }),
    onError,
  });

  const phaseMut = useMutation({
    mutationFn: (phase: LessonPhase) => setPhase(classId!, phase),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teacher', 'dashboard', classId] }),
    onError,
  });

  if (dash.isLoading) return <p className="lead-text">Loading class…</p>;
  if (dash.isError || !dash.data)
    return <p className="lead-text text-brand-coral">Could not load this class.</p>;

  const ordered = sortTiles(tiles);
  const hands = raisedHands(tiles);
  const frozen = dash.data.frozen;

  return (
    <div data-testid="class-dashboard">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-sky">Class session</div>
          <h1 className="hero-display">{dash.data.className}</h1>
        </div>

        {/* Pacing: timer · phase · freeze-all (§17.16 45-min pacing tools). */}
        <div className="flex flex-wrap items-center gap-2">
          {dash.data.timerSeconds != null && (
            <span data-testid="class-timer" className="sticker-sunshine">
              ⏱ {formatTimer(dash.data.timerSeconds)}
            </span>
          )}
          <div className="flex gap-1" data-testid="lesson-phase">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                data-testid={`phase-${p}`}
                aria-pressed={dash.data!.phase === p}
                className={clsx(
                  'btn-pill-ghost text-[12px]',
                  dash.data!.phase === p && 'bg-wash-coral font-bold',
                )}
                onClick={() => phaseMut.mutate(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            data-testid="freeze-all"
            aria-pressed={frozen}
            className={clsx('btn-pill-primary text-[13px]', frozen && 'opacity-80')}
            onClick={() => freezeMut.mutate(!frozen)}
          >
            {frozen ? 'Unfreeze' : '🧊 Freeze all'}
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-2xl bg-wash-coral px-4 py-3 text-[14px] font-medium text-ink">
          {actionError}
        </div>
      )}

      {/* Raised hands, longest-waited first (§17.17). */}
      {hands.length > 0 && (
        <div data-testid="raised-hands" className="card-base mb-6 p-4">
          <div className="mb-2 text-[13px] font-bold text-ink">
            ✋ Raised hands ({hands.length}) — longest wait first
          </div>
          <ol className="flex flex-wrap gap-2">
            {hands.map((t, i) => (
              <li key={t.kidId} data-testid="hand-entry" className="sticker-coral">
                {i + 1}. {t.nickname}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {ordered.map((tile) => (
          <KidTileCard
            key={tile.kidId}
            classId={classId!}
            tile={tile}
            onPushHint={(kidId) => hintMut.mutate(kidId)}
            onToggleTakeOver={(t) => takeOverMut.mutate(t)}
          />
        ))}
      </div>
    </div>
  );
}
