import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { api } from '@/lib/api';
import { type AvailableClass, ClassCard } from './availableClasses';

// How many open classes to surface on the Dashboard before pointing to the full list.
const DASHBOARD_LIMIT = 3;

// Dashboard "Now enrolling" panel: the first thing a freshly-logged-in parent should
// see — which classes are actually open for enrollment right now. It queries EVERY city
// (`/class-seats/classes` with no `?city=`), so a parent whose family city has no open
// class still sees what is opening elsewhere instead of a blank page. The full,
// city-filtered browse lives at /portal/classes.
export function NowEnrollingPanel() {
  // Shares the ['class-seats','classes','__all__'] cache key with the Find-a-class page's
  // "All cities" query so the two views never refetch the same list.
  const classes = useQuery<AvailableClass[]>({
    queryKey: ['class-seats', 'classes', '__all__'],
    queryFn: () => api<AvailableClass[]>('/class-seats/classes'),
  });

  const open = classes.data ?? [];

  return (
    <section className="mb-10" data-testid="now-enrolling">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow eyebrow-coral">Now enrolling</div>
          <h2 className="text-[28px] font-bold leading-tight text-ink">Classes open right now</h2>
        </div>
        <Link to="/portal/classes" className="btn-pill-ghost">
          See all classes
        </Link>
      </div>

      {classes.isLoading && <p className="lead-text">Loading open classes…</p>}

      {!classes.isLoading && classes.isError && (
        <div className="rounded-2xl border border-hairline bg-canvas-pure px-5 py-4">
          <p className="text-[15px] font-semibold text-ink">We couldn’t load open classes.</p>
          <p className="mt-1 text-[13px] text-slate2">
            This is a temporary hiccup on our side. Please try again.
          </p>
          <button type="button" onClick={() => classes.refetch()} className="btn-pill-ghost mt-3">
            Retry
          </button>
        </div>
      )}

      {!classes.isLoading && !classes.isError && open.length === 0 && (
        <div className="rounded-2xl border border-hairline bg-canvas-pure px-5 py-4">
          <p className="text-[15px] font-semibold text-ink">No classes are open just yet.</p>
          <p className="mt-1 text-[13px] text-slate2">
            New classes open regularly. Tell us what you’re after and we’ll match a time.
          </p>
          <Link to="/portal/courses" className="btn-pill-ghost mt-3">
            Browse courses
          </Link>
        </div>
      )}

      {open.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {open.slice(0, DASHBOARD_LIMIT).map((item) => (
            <ClassCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
