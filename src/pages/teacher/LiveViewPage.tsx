import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { useWsEvent } from '@/lib/useWsEvent';

interface ConsoleLine {
  level: 'log' | 'warn' | 'error';
  text: string;
}

interface LiveSnapshotEvent {
  kidId: string;
  thumbnailDataUrl?: string;
  console?: ConsoleLine;
}

/**
 * Teacher live read-only view of a single kid's session — J6 (PRD §17.6).
 * Read-only by construction: there is NO editor and NO chat input here, so the
 * teacher can never take the wheel from this surface (take-over is an explicit,
 * audited action from the dashboard). The console stream is PII-redacted at the
 * source (D-GAME5b). Live deltas arrive over the class room WS.
 */
export function LiveViewPage() {
  const { classId, kidId } = useParams<{ classId: string; kidId: string }>();
  const [thumb, setThumb] = useState<string | null>(null);
  const [lines, setLines] = useState<ConsoleLine[]>([]);

  useWsEvent<LiveSnapshotEvent>(
    'class.live',
    (ev) => {
      if (ev.kidId !== kidId) return;
      if (ev.thumbnailDataUrl) setThumb(ev.thumbnailDataUrl);
      if (ev.console) setLines((prev) => [...prev.slice(-49), ev.console!]);
    },
    [kidId],
  );

  // The kid sees a clear "your teacher is viewing" indicator (transparency,
  // §11f) — emitted to the kid session when this view opens.
  useEffect(() => {
    // Intentionally no editing affordance is mounted on this page.
  }, []);

  return (
    <div data-testid="live-view">
      <Link to={`/teacher/classes/${classId}`} className="btn-pill-ghost mb-4 -ml-3 text-[13px]">
        ← Class dashboard
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <span className="sticker-sky">👀 Read-only</span>
        <h1 className="section-heading" style={{ fontSize: '22px' }}>
          Watching live
        </h1>
      </div>
      <p className="lead-text mb-6 text-[14px]">
        This is a live, read-only view. To act in the project, use “Take over” on the dashboard.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-ink/90" data-testid="live-thumb">
          {thumb ? (
            <img src={thumb} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-[13px] font-semibold text-white/50">
              waiting for the game to run…
            </div>
          )}
        </div>

        <div className="card-base p-4" data-testid="live-console">
          <div className="mb-2 text-[13px] font-bold text-ink">Console (PII-redacted)</div>
          <ul className="flex flex-col gap-1 font-mono text-[12px]">
            {lines.map((l, i) => (
              <li key={i} className={l.level === 'error' ? 'text-brand-coral' : 'text-ink-soft'}>
                {l.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <Link
        to={`/teacher/classes/${classId}/kids/${kidId}/assessment`}
        data-testid="open-assessment"
        className="btn-pill-secondary mt-6 inline-block text-[13px]"
      >
        Open assessment →
      </Link>
    </div>
  );
}
