import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api } from '@/lib/api';

// A Mission is the kid's TASK inside a Lesson — what the child actually does to
// earn Stars (links out to a Project).
interface Mission {
  id: string;
  slug: string;
  title: string;
  description: string;
  estimated_stars: number;
  order_index: number;
  // Art missions carry their studio config here (image-studio-prd D-IS-20/22);
  // the pack endpoint returns full mission rows so this rides for free.
  steps_json?: {
    art?: {
      template?: { url: string; layer: 'underlay' | 'base'; magic?: 'with-base' | 'strokes-only' };
    };
  } | null;
}

// A Lesson (课节) is the course-content unit: an ordered step in the pack that
// holds one or more Mission tasks.
interface Lesson {
  id: string;
  slug: string;
  title: string;
  description: string;
  order_index: number;
  missions: Mission[];
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
  lessons: Lesson[];
}

export function PackLessonsPage() {
  const { id: slug } = useParams<{ id: string }>();
  const nav = useNavigate();

  const pack = useQuery<CoursePack>({
    queryKey: ['course-pack', slug],
    queryFn: () => api<CoursePack>(`/course-packs/${slug}`),
    enabled: !!slug,
  });

  if (pack.isLoading) return <p className="lead-text">Loading…</p>;
  if (!pack.data)
    return (
      <div>
        <div className="eyebrow">Lesson</div>
        <h1 className="section-heading">Not found</h1>
        <Link to="/learn/missions" className="btn-pill-secondary mt-6">← Back</Link>
      </div>
    );

  const isCreative = pack.data.product_line === 'line_a_creative';
  const color = isCreative ? 'coral' : 'sky';
  const lessons = pack.data.lessons;

  return (
    <div>
      <Link to="/learn/missions" className="btn-pill-ghost mb-4 -ml-3">← Lessons</Link>

      <div className={`pack-card ${color} mb-10 cursor-default`} style={{ minHeight: 'auto' }}>
        <span className="pack-blob" />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
            {isCreative ? 'Creative' : 'Coding'} · Ages {pack.data.target_age_min}-
            {pack.data.target_age_max}
          </div>
          <h1 className="mt-3 text-[36px] font-bold leading-tight">{pack.data.title}</h1>
          <p className="mt-3 text-[16px] opacity-90 max-w-2xl">{pack.data.description}</p>
          <div className="mt-6 text-[14px] font-bold uppercase tracking-[0.10em] opacity-85">
            {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} ·{' '}
            {pack.data.estimated_stars}★ total
          </div>
        </div>
      </div>

      <h2 className="section-heading mb-6" style={{ fontSize: '24px' }}>Lessons</h2>

      {lessons.length === 0 ? (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">Lessons for this pack are being added.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson, i) => (
            <div key={lesson.id} className="card-base">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-${color} text-white font-extrabold text-[20px] shadow-brand-${color}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[18px] font-bold text-ink">{lesson.title}</div>
                  {lesson.description && (
                    <p className="text-[14px] text-ink-soft mt-2">{lesson.description}</p>
                  )}

                  {/* The kid's Mission task(s) inside this Lesson. */}
                  {lesson.missions.length === 0 ? (
                    <p className="mt-3 text-[13px] text-slate2">Tasks coming soon.</p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {lesson.missions.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-start gap-3 rounded-2xl bg-surface px-4 py-3"
                        >
                          <span className="mt-0.5 shrink-0 text-[15px]">🚀</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-[15px] font-semibold text-ink">{m.title}</div>
                            {m.description && (
                              <p className="text-[13px] text-ink-soft mt-1">{m.description}</p>
                            )}
                            <div className="mt-2 text-[12px] font-bold uppercase tracking-[0.10em] text-slate2">
                              {m.estimated_stars}★ to complete
                            </div>
                          </div>
                          <button
                            onClick={() =>
                              m.steps_json?.art
                                ? nav('/learn/create/image', {
                                    // Art missions open the Art Studio in Mission
                                    // Mode (image-studio-prd D-IS-20/22).
                                    state: {
                                      mission: {
                                        id: m.id,
                                        slug: m.slug,
                                        title: m.title,
                                        description: m.description,
                                        template: m.steps_json.art.template,
                                      },
                                    },
                                  })
                                : nav('/learn/projects/new', {
                                    state: { mission_id: m.id, mission_slug: m.slug, title: m.title },
                                  })
                            }
                            className="btn-pill-primary shrink-0"
                          >
                            Start →
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
