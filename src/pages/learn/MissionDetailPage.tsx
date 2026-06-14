import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { MissionRunPage, Mission, CoursePack } from './MissionRunPage';

// Detail view needs extra fields beyond what MissionRunPage's CoursePack covers
interface CoursePackDetail extends CoursePack {
  description: string;
  target_age_min: number;
  target_age_max: number;
  estimated_stars: number;
  missions: Mission[];
}

export function MissionDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const missionId = searchParams.get('mission') ?? undefined;
  const nav = useNavigate();
  const me = useMe();
  const qc = useQueryClient();

  const pack = useQuery<CoursePackDetail>({
    queryKey: ['course-pack', slug],
    queryFn: () => api<CoursePackDetail>(`/course-packs/${slug}`),
    enabled: !!slug,
  });

  // Start a mission — POST /projects with mission_id, then navigate to run view
  const startMission = useMutation({
    mutationFn: (mission: Mission) =>
      api<{ id: string }>('/projects', {
        method: 'POST',
        body: {
          title: mission.title,
          product_line: pack.data?.product_line ?? 'line_a_creative',
          mission_id: mission.id,
        },
      }),
    onSuccess: (res, mission) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      nav(`/learn/missions/${slug}?project=${res.id}&mission=${mission.id}`);
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        // Already in-progress — find the existing project and resume
        const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
        if (!kidId) return;
        api<{ id: string; mission_id: string; status: string }[]>(`/kids/${kidId}/projects`)
          .then((projects) => {
            const existing = projects.find(
              (p) => p.mission_id === startMission.variables?.id && p.status === 'in_progress',
            );
            if (existing) nav(`/learn/missions/${slug}?project=${existing.id}&mission=${existing.mission_id}`);
          })
          .catch(() => undefined);
      }
    },
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

  // Run view — project param is set
  if (projectId && pack.data) {
    const allMissions = pack.data.missions.sort((a, b) => a.order_index - b.order_index);
    return (
      <MissionRunPage
        pack={pack.data}
        missions={allMissions}
        projectId={projectId}
        packSlug={slug!}
        initialMissionId={missionId}
      />
    );
  }

  // Detail view — pick a mission to start
  const isCreative = pack.data.product_line === 'line_a_creative';
  const color = isCreative ? 'coral' : 'sky';

  return (
    <div>
      <Link to="/learn/missions" className="btn-pill-ghost mb-4 -ml-3">← Missions</Link>

      <div className={`pack-card ${color} mb-10 cursor-default`} style={{ minHeight: 'auto' }}>
        <span className="pack-blob" />
        <div className="relative">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
            {isCreative ? 'Creative' : 'Coding'} · Ages {pack.data.target_age_min}–{pack.data.target_age_max}
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
          {pack.data.missions
            .sort((a, b) => a.order_index - b.order_index)
            .map((m, i) => (
              <div key={m.id} className="card-base">
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl bg-grad-${color} text-white font-extrabold text-[20px] shadow-brand-${color}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[18px] font-bold text-ink">{m.title}</div>
                    <p className="text-[14px] text-ink-soft mt-2">{m.description}</p>
                    <div className="mt-3 text-[12px] font-bold uppercase tracking-[0.10em] text-steel">
                      {m.estimated_stars}★ to complete
                    </div>
                  </div>
                  <button
                    onClick={() => startMission.mutate(m)}
                    disabled={startMission.isPending}
                    className="btn-pill-primary shrink-0"
                  >
                    {startMission.isPending && startMission.variables?.id === m.id ? 'Starting…' : 'Start →'}
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
