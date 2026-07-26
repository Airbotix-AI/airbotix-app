import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { CourseComparisonList } from './CourseComparisonList';
import { MyClassesPanel } from './MyClassesPanel';
import type { CoursePack, Kid, MarketingCourseCard } from './courseComparison';

export function CoursesPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const contactEmail = me.data?.kind === 'user' ? me.data.email : undefined;

  // `bookable=true` = taught AND put on sale by owner. Without it this list also showed
  // content-ready drafts nobody has priced: the parent got a "Request a seat" button on a
  // course whose class times 404, and the enrolment landed in the DB anyway
  // (booking-enrollment-prd D-6). The learn-side catalog still lists every published
  // pack, so the query key MUST stay distinct from ['course-packs'] — same key, different
  // filter would let whichever page loaded first serve its cache to the other.
  const packs = useQuery<CoursePack[]>({
    queryKey: ['course-packs', 'bookable'],
    queryFn: () => api<CoursePack[]>('/course-packs?bookable=true'),
  });

  const kids = useQuery<Kid[]>({
    queryKey: ['families', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: !!familyId,
  });

  // The public marketing catalog is the comparison SOT: it carries the parent-facing price,
  // difficulty, length, outcome and "best for" copy already used by /programs/compare. Join it
  // by slug to the protected bookable packs so comparison never makes an unsellable course
  // actionable, while price/copy updates remain runtime-driven rather than duplicated here.
  const comparisonCatalog = useQuery<MarketingCourseCard[]>({
    queryKey: ['marketing-courses', 'comparison'],
    queryFn: () => api<MarketingCourseCard[]>('/courses'),
  });

  return (
    <div>
      <MyClassesPanel compact />

      <div className="mb-8">
        <div className="eyebrow eyebrow-bubblegum">Courses</div>
        <h1 className="hero-display">
          Compare courses for your <span className="squiggle-word">kid.</span>
        </h1>
        <p className="lead-text mt-4">
          See the differences that matter before you choose: age fit, difficulty, time, price, and
          what your child will make.
        </p>
      </div>

      {(packs.isLoading || comparisonCatalog.isLoading) && (
        <p className="lead-text">Loading course comparison…</p>
      )}

      {!packs.isLoading && (packs.data?.length ?? 0) === 0 && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">New courses are being added. Check back soon!</p>
        </div>
      )}

      {(packs.data?.length ?? 0) > 0 && !comparisonCatalog.isLoading && (
        <CourseComparisonList
          packs={packs.data ?? []}
          catalog={comparisonCatalog.data ?? []}
          kids={kids.data ?? []}
          familyId={familyId}
          contactEmail={contactEmail}
          comparisonUnavailable={comparisonCatalog.isError}
        />
      )}
    </div>
  );
}
