import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { api } from '@/lib/api';

interface Mission {
  id: string;
  slug: string;
  title: string;
  description: string;
  estimated_stars: number;
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
  mission_count: number;
  estimated_stars: number;
  missions: Mission[];
}

export function MissionsListPage() {
  const packs = useQuery<CoursePack[]>({
    queryKey: ['course-packs'],
    queryFn: () => api<CoursePack[]>('/course-packs'),
  });

  const creative = packs.data?.filter((p) => p.product_line === 'line_a_creative') ?? [];
  const coding = packs.data?.filter((p) => p.product_line === 'line_b_coding') ?? [];

  return (
    <div>
      <div className="mb-10">
        <div className="eyebrow eyebrow-bubblegum">Missions</div>
        <h1 className="hero-display">
          Pick an <span className="squiggle-word">adventure</span>.
        </h1>
        <p className="lead-text mt-4">
          Step-by-step missions. Earn Stars by finishing.
        </p>
      </div>

      {packs.isLoading && <p className="lead-text">Loading…</p>}

      {!packs.isLoading && (!packs.data || packs.data.length === 0) && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">
            New missions are being added right now. Check back soon!
          </p>
          <Link to="/learn" className="btn-pill-primary mt-6">← Back home</Link>
        </div>
      )}

      {creative.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-heading" style={{ fontSize: '28px' }}>Creative</h2>
            <span className="sticker-coral alt">{creative.length} packs</span>
          </div>
          <PackGrid packs={creative} color="coral" />
        </section>
      )}

      {coding.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="section-heading" style={{ fontSize: '28px' }}>Coding</h2>
            <span className="sticker-sky">{coding.length} packs</span>
          </div>
          <PackGrid packs={coding} color="sky" />
        </section>
      )}
    </div>
  );
}

function PackGrid({ packs, color }: { packs: CoursePack[]; color: 'coral' | 'sky' }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {packs.map((pack) => (
        <Link
          key={pack.id}
          to={`/learn/missions/${pack.slug}`}
          className={`pack-card ${color} block`}
        >
          <span className="pack-blob" />
          <div className="relative">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Ages {pack.target_age_min}-{pack.target_age_max}
            </div>
            <div className="mt-3 text-[24px] font-bold leading-tight">{pack.title}</div>
            <div className="mt-2 text-[14px] opacity-90 line-clamp-3">{pack.description}</div>
            <div className="mt-6 flex items-center justify-between">
              <div className="text-[13px] font-semibold opacity-90">
                {pack.mission_count} missions · {pack.estimated_stars}★
              </div>
              <div className="rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]">
                Open →
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
