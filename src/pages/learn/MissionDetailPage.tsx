import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api } from '@/lib/api';

interface Mission {
  id: string;
  slug: string;
  title: string;
  description: string;
  estimated_stars: number;
  order_index: number;
  content_md: string;
}

interface CoursePack {
  id: string;
  slug: string;
  title: string;
  description: string;
  target_age_min: number;
  target_age_max: number;
  product_line: 'line_a_creative' | 'line_b_coding';
  mission_count: number;
  estimated_stars: number;
  missions: Mission[];
}

export function MissionDetailPage() {
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
        <div className="eyebrow">Mission</div>
        <h1 className="section-heading">Not found</h1>
        <Link to="/learn/missions" className="btn-pill-secondary mt-6">← Back</Link>
      </div>
    );

  const isCreative = pack.data.product_line === 'line_a_creative';
  const color = isCreative ? 'coral' : 'sky';

  return (
    <div>
      <Link to="/learn/missions" className="btn-pill-ghost mb-4 -ml-3">← Missions</Link>

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
            {pack.data.mission_count} missions · {pack.data.estimated_stars}★ total
          </div>
        </div>
      </div>

      <h2 className="section-heading mb-6" style={{ fontSize: '24px' }}>Missions</h2>

      {pack.data.missions.length === 0 ? (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">Missions for this pack are being added.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pack.data.missions.map((m, i) => (
            <div key={m.id} className="card-base">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-${color} text-white font-extrabold text-[20px] shadow-brand-${color}`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[18px] font-bold text-ink">{m.title}</div>
                  <p className="text-[14px] text-ink-soft mt-2">{m.description}</p>
                  <div className="mt-3 text-[12px] font-bold uppercase tracking-[0.10em] text-slate2">
                    {m.estimated_stars}★ to complete
                  </div>
                </div>
                <button
                  onClick={() =>
                    nav('/learn/projects/new', {
                      state: { mission_id: m.id, mission_slug: m.slug, title: m.title },
                    })
                  }
                  className="btn-pill-primary shrink-0"
                >
                  Start →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
