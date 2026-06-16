import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Calendar, FolderOpen, Image as ImageIcon } from 'lucide-react';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { useWsEvent } from '@/lib/useWsEvent';
import {
  getClass,
  getWall,
  listMyClasses,
  type ClassMineSummary,
  type ClassSummary,
  type WallPost,
} from './classroomApi';
import { COVER_GRAD, coverColor, coverEmoji } from './classCover';
import { WallCard } from './WallCard';
import { CreateForClassSheet } from './CreateForClassSheet';
import { WorkCard } from '../projects/WorkCard';
import { usePlacement } from '../projects/usePlacement';
import { ShareToClassModal } from './ShareToClassModal';
import type { KidProject } from '../projects/kidProject';

type HubTab = 'wall' | 'mywork' | 'lessons' | 'next';

const TABS: { key: HubTab; label: string; icon: typeof ImageIcon }[] = [
  { key: 'wall', label: 'Wall', icon: ImageIcon },
  { key: 'mywork', label: 'My work', icon: FolderOpen },
  { key: 'lessons', label: 'Lessons', icon: BookOpen },
  { key: 'next', label: 'Next class', icon: Calendar },
];

/** Class hub — `/learn/classroom/:classId` (my-classes-prd §2 + §4). */
export function ClassHubPage() {
  const { classId } = useParams<{ classId: string }>();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [shareProject, setShareProject] = useState<KidProject | null>(null);

  const rawTab = params.get('tab');
  const tab: HubTab = TABS.some((t) => t.key === rawTab) ? (rawTab as HubTab) : 'wall';
  const setTab = (t: HubTab) => setParams(t === 'wall' ? {} : { tab: t }, { replace: true });

  // Enriched header (find this class in the kid's enriched list); fall back to
  // the basic class read while the enriched list loads / on miss.
  const myClasses = useQuery<ClassMineSummary[]>({
    queryKey: ['kid', kidId, 'classes'],
    queryFn: () => listMyClasses(),
    enabled: !!kidId,
  });
  const basic = useQuery<ClassSummary>({
    queryKey: ['class', classId],
    queryFn: () => getClass(classId!),
    enabled: !!classId,
  });
  const enriched = myClasses.data?.find((c) => c.id === classId) ?? null;

  return (
    <div>
      <Link to="/learn/classroom" className="text-[13px] font-semibold text-slate2">
        ← My Classes
      </Link>

      <ClassHeader
        classId={classId!}
        enriched={enriched}
        name={enriched?.name ?? basic.data?.name ?? 'Class'}
        onCreate={() => setSheetOpen(true)}
      />

      {/* Sub-tabs (NO Classmates tab — D-MC-12) */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-hairline" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              data-testid={`tab-${t.key}`}
              className={`-mb-px flex items-center gap-1.5 border-b-[3px] px-4 py-3 text-[15px] font-bold transition-colors ${
                active
                  ? 'border-brand-coral text-ink'
                  : 'border-transparent text-slate2 hover:text-ink'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === 'wall' && <WallTab classId={classId!} />}
        {tab === 'mywork' && (
          <MyWorkTab
            classId={classId!}
            kidId={kidId}
            classes={myClasses.data ?? []}
            onCreate={() => setSheetOpen(true)}
            onShareRequest={setShareProject}
          />
        )}
        {tab === 'lessons' && <ComingSoon icon={BookOpen} title="Lessons are coming soon" body="Your class follows a course. Soon you'll see each lesson here — what you've done, what's next, and the stars you earned." />}
        {tab === 'next' && <ComingSoon icon={Calendar} title="Your schedule is coming soon" body="When and where your next class happens will show up here." />}
      </div>

      {sheetOpen && (
        <CreateForClassSheet
          className={enriched?.name ?? basic.data?.name ?? 'this class'}
          onClose={() => setSheetOpen(false)}
        />
      )}

      {shareProject && (
        <ShareToClassModal
          projectId={shareProject.id}
          onClose={() => setShareProject(null)}
          onShared={() => qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] })}
        />
      )}
    </div>
  );
}

function ClassHeader({
  classId,
  enriched,
  name,
  onCreate,
}: {
  classId: string;
  enriched: ClassMineSummary | null;
  name: string;
  onCreate: () => void;
}) {
  const color = coverColor(classId);
  const emoji = coverEmoji(classId);
  const total = enriched?.lessons_total ?? 0;
  const doneN = enriched?.lessons_done ?? 0;
  const pct = total > 0 ? Math.round((doneN / total) * 100) : 0;

  return (
    <div className="mt-3 overflow-hidden rounded-3xl bg-canvas-pure shadow-card-soft">
      <div
        className={`relative flex h-24 items-center px-7 text-[40px] ${
          enriched?.cover_image_url ? '' : COVER_GRAD[color]
        }`}
      >
        {enriched?.cover_image_url ? (
          <img src={enriched.cover_image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{emoji}</span>
        )}
        {enriched?.is_live && (
          <span className="sticker-coral absolute right-5 top-4" style={{ fontSize: '10px' }}>
            ● LIVE NOW
          </span>
        )}
      </div>
      <div className="px-7 pb-6 pt-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="section-heading" style={{ fontSize: '28px' }}>
              {name}
            </h1>
            {enriched?.course_title && (
              <div className="mt-1 text-[13px] text-slate2">{enriched.course_title}</div>
            )}
          </div>
          <button onClick={onCreate} className="btn-pill-primary" data-testid="hub-create">
            + Create for this class
          </button>
        </div>
        {total > 0 && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-2 max-w-[360px] flex-1 overflow-hidden rounded-full bg-surface-soft">
              <div className="h-full rounded-full bg-grad-mint" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[13px] font-bold text-slate2">
              {doneN} / {total} lessons done
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function WallTab({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const wall = useQuery<WallPost[]>({
    queryKey: ['class', classId, 'wall'],
    queryFn: () => getWall(classId),
    enabled: !!classId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['class', classId, 'wall'] });
  useWsEvent('wall.post.published', invalidate, [classId]);
  useWsEvent('wall.post.hidden', invalidate, [classId]);
  useWsEvent('wall.reaction', invalidate, [classId]);
  useWsEvent('share.granted', invalidate, [classId]);
  useWsEvent('share.revoked', invalidate, [classId]);

  const posts = wall.data ?? [];

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-[20px] font-bold text-ink">
          What your <span className="squiggle-word">classmates</span> made
        </h2>
        <p className="mt-1 text-[13px] text-slate2">Like it. Get inspired. Share your own.</p>
      </div>
      {wall.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {posts.map((p) => (
            <WallCard key={p.id} post={p} classId={classId} />
          ))}
        </div>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Nothing yet</span>
          <p className="lead-text mt-4">No one has shared anything yet. Be the first!</p>
          <Link to="/learn/projects" className="btn-pill-primary mt-6">
            Share something of mine →
          </Link>
        </div>
      )}
    </section>
  );
}

function MyWorkTab({
  classId,
  kidId,
  classes,
  onCreate,
  onShareRequest,
}: {
  classId: string;
  kidId: string | null;
  classes: ClassMineSummary[];
  onCreate: () => void;
  onShareRequest: (p: KidProject) => void;
}) {
  const projects = useQuery<KidProject[]>({
    queryKey: ['projects', 'kid', kidId],
    queryFn: () => api<KidProject[]>(`/kids/${kidId}/projects`),
    enabled: !!kidId,
  });
  const placement = usePlacement({ kidId, onShareRequest });

  const mine = useMemo(
    () => (projects.data ?? []).filter((p) => p.class_id === classId),
    [projects.data, classId],
  );

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[20px] font-bold text-ink">My work for this class</h2>
        <Link to="/learn/projects" className="text-[13px] font-semibold text-brand-coral">
          See in My Works →
        </Link>
      </div>
      <p className="mb-4 text-[13px] text-slate2">
        All your projects in this class. Tap one to open it, or ⋯ to share &amp; move.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {mine.map((p) => (
          <WorkCard
            key={p.id}
            project={p}
            classes={classes}
            onDelete={undefined}
            {...placement.handlers(p)}
          />
        ))}
        <button
          onClick={onCreate}
          data-testid="mywork-create"
          className="flex min-h-[180px] flex-col items-center justify-center gap-1 rounded-3xl border-2 border-dashed border-hairline bg-canvas-pure text-center hover:border-brand-coral"
        >
          <span className="text-[32px]">＋</span>
          <span className="text-[13px] font-bold text-ink">
            Make something
            <br />
            for this class
          </span>
        </button>
      </div>

      {placement.dialog}
    </section>
  );
}

function ComingSoon({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BookOpen;
  title: string;
  body: string;
}) {
  return (
    <div className="card-base flex flex-col items-center py-12 text-center" data-testid="coming-soon">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-wash-sky text-brand-sky">
        <Icon size={26} />
      </span>
      <h3 className="section-heading mt-4" style={{ fontSize: '20px' }}>
        {title}
      </h3>
      <p className="lead-text mt-2 mx-auto" style={{ maxWidth: '440px', fontSize: '15px' }}>
        {body}
      </p>
    </div>
  );
}
