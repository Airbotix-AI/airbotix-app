import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

// A Lesson (课节) is the course-content unit inside a pack. Each Lesson carries the
// kid's Mission task(s); the catalog only needs the count of Lessons per pack.
interface Lesson {
  id: string;
  slug: string;
  title: string;
  order_index: number;
}

interface CoursePack {
  id: string;
  slug: string;
  title: string;
  description: string;
  target_age_min: number;
  target_age_max: number;
  product_line: 'line_a_creative' | 'line_b_coding';
  estimated_stars: number;
  // The pack's content list is its Lessons (课节). Content size = lessons.length.
  lessons: Lesson[];
}

export function LessonsCatalogPage() {
  const me = useMe();
  const myAge = me.data?.kind === 'kid' && typeof me.data.age === 'number' ? me.data.age : 10;

  const packs = useQuery<CoursePack[]>({
    queryKey: ['course-packs'],
    queryFn: () => api<CoursePack[]>('/course-packs'),
  });

  const groups = useMemo(() => {
    const all = packs.data ?? [];
    const mine: CoursePack[] = [];
    const younger: CoursePack[] = [];
    const older: CoursePack[] = [];
    for (const p of all) {
      if (myAge >= p.target_age_min && myAge <= p.target_age_max) mine.push(p);
      else if (p.target_age_max < myAge) younger.push(p);
      else older.push(p);
    }
    // sort each by product_line then title
    const sortKey = (p: CoursePack) => `${p.product_line}-${p.title}`;
    return {
      mine: mine.sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
      younger: younger.sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
      older: older.sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    };
  }, [packs.data, myAge]);

  return (
    <div>
      <div className="mb-10">
        <div className="eyebrow eyebrow-bubblegum">Lessons</div>
        <h1 className="hero-display">
          Pick an <span className="squiggle-word">adventure</span>.
        </h1>
        <p className="lead-text mt-4">
          Step-by-step lessons, sorted by your age. Earn Stars by finishing.
        </p>
      </div>

      {packs.isLoading && <p className="lead-text">Loading…</p>}

      {!packs.isLoading && (packs.data?.length ?? 0) === 0 && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">
            New lessons are being added. Check back soon!
          </p>
          <Link to="/learn" className="btn-pill-primary mt-6">← Back home</Link>
        </div>
      )}

      {groups.mine.length > 0 && (
        <Section
          title={`Just right for age ${myAge}`}
          subtitle={`Pick from these — perfect for what you can do now.`}
          color="coral"
          packs={groups.mine}
          highlight
        />
      )}

      {groups.older.length > 0 && (
        <Section
          title="A little harder"
          subtitle="Try these when you want a challenge."
          color="sky"
          packs={groups.older}
        />
      )}

      {groups.younger.length > 0 && (
        <Section
          title="Easier warm-ups"
          subtitle="Quick ones for when you want a break."
          color="mint"
          packs={groups.younger}
        />
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  color,
  packs,
  highlight = false,
}: {
  title: string;
  subtitle: string;
  color: 'coral' | 'sky' | 'mint';
  packs: CoursePack[];
  highlight?: boolean;
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="section-heading" style={{ fontSize: '24px' }}>{title}</h2>
          <p className="text-[13px] text-slate2 mt-1">{subtitle}</p>
        </div>
        {highlight && <span className={`sticker-${color}`}>Best fit</span>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {packs.map((p) => {
          const cardColor: 'coral' | 'sky' | 'mint' | 'bubblegum' =
            p.product_line === 'line_a_creative' ? 'coral' : 'sky';
          const lessonCount = p.lessons.length;
          return (
            <Link
              key={p.id}
              to={`/learn/missions/${p.slug}`}
              className={`pack-card ${cardColor} block`}
            >
              <span className="pack-blob" />
              <div className="relative">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
                  Ages {p.target_age_min}-{p.target_age_max} ·{' '}
                  {p.product_line === 'line_a_creative' ? 'Creative' : 'Coding'}
                </div>
                <div className="mt-3 text-[24px] font-bold leading-tight">{p.title}</div>
                <div className="mt-2 text-[13px] opacity-90 line-clamp-3">{p.description}</div>
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-[13px] font-semibold opacity-90">
                    {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'} · {p.estimated_stars}★
                  </div>
                  <div className="rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
                    Open →
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
