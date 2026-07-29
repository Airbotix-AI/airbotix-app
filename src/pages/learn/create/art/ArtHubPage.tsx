// Art Studio hub — `/learn/create/image` (image-studio-prd.md D-IS-28).
//
// Before this page the Art Studio card opened the canvas DIRECTLY, so every
// visit started a blank drawing and the kid's previous pictures were reachable
// only via My Works → My Pictures → a picture → "Keep drawing" (four levels
// deep). Owner report 2026-07-25: 每次做新的画,之前的画呢.
//
// The hub is the studio's landing surface and answers the three things a kid
// arrives asking — 任务 (art tasks) · 学习 (how the studio works) · 作品 (my
// pictures) — with "draw a new one" as ONE action among them rather than the
// only one. Mirrors the Story Blocks split: hub at `/learn/create/blocks`,
// studio at `/learn/blocks/:id`. The canvas now lives at
// `/learn/create/image/canvas`.
//
// Drawing is free here — no Stars are spent anywhere on this page.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { useArtifactUrl, type Artifact } from '../shared/useStudio';
import type { ArtMission } from './ArtStudioPage';
import { ArtTaskModePicker } from './ArtTaskModePicker';
import { completedTaskSlugs, nextDrawingTask } from './artTaskProgression';
import type { ArtTaskDrawMode, ArtTaskListItem } from './artTaskTypes';
import { artTaskSlugFromSteps } from './artTaskTypes';

/** Where the canvas itself lives, now that this hub owns `/learn/create/image`. */
export const ART_CANVAS_PATH = '/learn/create/image/canvas';

// How many pictures the hub grid shows before deferring to the full My Pictures
// project page. Each thumbnail costs one signed-URL round trip (there is no batch
// endpoint), so the landing page stays cheap and "See all" carries the long tail.
const HUB_PICTURE_LIMIT = 12;
const HUB_GALLERY_FETCH_LIMIT = 200;

/**
 * One art task — a Mission the child must hand a PICTURE in for. `art` carries the
 * optional Mission Mode studio config (template / draw-along / checklist) and is
 * null for the many tasks that only declare an image acceptance.
 */
interface ArtMissionRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  estimated_stars: number;
  /** Authored child-facing task sequence returned by the art-missions endpoint. */
  steps: ArtMission['steps'];
  art: {
    template?: ArtMission['template'];
    draw_along?: string[];
    checklist?: string[];
  } | null;
  lesson: { id: string; title: string; order_index: number };
  course_pack: { slug: string; title: string; product_line: string };
}

/**
 * A course from `GET /course-packs` (published only). The list endpoint already
 * returns the whole content tree, so the hub counts a course's tasks without a
 * second request — and without a bespoke endpoint just for course cards.
 */
interface CoursePackRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  target_age_min: number;
  target_age_max: number;
  product_line: 'line_a_creative' | 'line_b_coding';
  estimated_stars: number;
  lessons: Array<{ id: string; title: string; missions?: Array<{ id: string }> }>;
}

// `line_a_creative` is the platform's making/creative line — the courses that live
// next to the Art Studio (comic book, picture book, anime, the Art Studio course
// itself). Coding-line courses are shown only through their individual art TASKS.
const ART_COURSE_LINE = 'line_a_creative';

const PUBLIC_COURSE_TITLES: Readonly<Record<string, string>> = {
  'ai-comic-book': 'Create Your Own Comic Book with AI',
};

function publicCourseTitle(course: { slug: string; title: string }): string {
  return PUBLIC_COURSE_TITLES[course.slug] ?? course.title;
}

// The studio's three AI powers, priced exactly as the canvas charges them
// (ArtStudioPage MAGIC_COST / GHOST_COST / CHAT_COST → backend pricing.ts).
// Shown here so a kid learns what each button does BEFORE spending Stars on it.
const AI_POWERS = [
  {
    emoji: '👻',
    title: 'Ghost sketch',
    cost: 2,
    body: 'Ask for a faint guide under your paper, then trace it in your own way.',
  },
  {
    emoji: '👀',
    title: 'Coach look',
    cost: 1,
    body: 'The Coach looks at what you drew and tells you what to try next.',
  },
  {
    emoji: '✨',
    title: 'Bring it to life',
    cost: 9,
    body: 'Turn your own sketch into a finished picture. Your drawing is never replaced.',
  },
];

/** One saved picture. The signed URL is fetched per artifact, like the parent gallery. */
function PictureCard({ artifact, onOpen }: { artifact: Artifact; onOpen: () => void }) {
  const url = useArtifactUrl(artifact);
  const meta = artifact.metadata as { prompt?: string; character?: string; source?: string };
  const label = meta.character ?? meta.prompt ?? 'My drawing';
  // What the kid made, in their terms: their own strokes vs an AI take vs a saved character.
  const badge = meta.character
    ? '👤 Character'
    : meta.source === 'canvas-sketch' || meta.source === 'art-task'
      ? '✏️ I drew it'
      : '✨ AI';

  return (
    <button
      type="button"
      data-testid="art-hub-picture"
      onClick={onOpen}
      className="overflow-hidden rounded-2xl border border-hairline bg-canvas-pure text-left transition hover:-translate-y-0.5 hover:shadow-card-soft"
    >
      <div className="aspect-square w-full bg-surface">
        {url.data && (
          <img src={url.data} alt={label} className="h-full w-full object-cover" loading="lazy" />
        )}
      </div>
      <div className="p-3">
        <div className="truncate text-[13px] font-bold text-ink">{label}</div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-semibold text-slate2">
          <span>{badge}</span>
          <span>{formatDistanceToNow(new Date(artifact.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </button>
  );
}

function DrawingIdeaCard({
  task,
  completed,
  onPick,
}: {
  task: ArtTaskListItem;
  completed: boolean;
  onPick: (task: ArtTaskListItem) => void;
}) {
  return (
    <button
      type="button"
      data-testid="art-guided-task"
      onClick={() => onPick(task)}
      className="overflow-hidden rounded-[26px] border border-hairline bg-canvas-pure text-left transition hover:-translate-y-0.5 hover:shadow-card-soft"
    >
      <img
        src={task.cover.url}
        alt={task.cover.alt}
        className="aspect-[4/3] w-full bg-surface object-cover"
      />
      <span className="block p-4">
        <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-brand-mint">
          <span>
            {task.category} · Ages {task.age_min}–{task.age_max}
          </span>
          {completed && <span className="text-brand-bubblegum">✓ Done</span>}
        </span>
        <span className="mt-1 block text-[18px] font-black text-ink">{task.title}</span>
        <span className="mt-1 block text-[12px] text-ink-soft">{task.short_description}</span>
        {task.progression && (
          <span className="mt-2 block text-[11px] font-bold text-brand-bubblegum">
            {task.progression.path_title} · {task.progression.position}/{task.progression.total}
          </span>
        )}
        <span className="mt-3 block text-[11px] font-bold text-slate2">
          {task.step_count} steps · {task.duration_minutes} min · Difficulty{' '}
          {'●'.repeat(task.difficulty)}
          {'○'.repeat(3 - task.difficulty)}
        </span>
      </span>
    </button>
  );
}

export function ArtHubPage() {
  const nav = useNavigate();
  const [pickedTask, setPickedTask] = useState<ArtTaskListItem | null>(null);
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const pictures = useQuery<Artifact[]>({
    queryKey: ['kid', kidId, 'artifacts', 'image', HUB_GALLERY_FETCH_LIMIT],
    queryFn: () =>
      api<Artifact[]>(`/kids/${kidId}/artifacts?kind=image&limit=${HUB_GALLERY_FETCH_LIMIT}`),
    enabled: Boolean(kidId),
  });

  const missions = useQuery<ArtMissionRow[]>({
    queryKey: ['art-missions'],
    queryFn: () => api<ArtMissionRow[]>('/course-packs/art-missions'),
  });
  const guidedTasks = useQuery<ArtTaskListItem[]>({
    queryKey: ['art-studio-tasks'],
    queryFn: () => api<ArtTaskListItem[]>('/art-studio/tasks'),
  });

  // Shares the Lessons catalogue's query key, so arriving from there is a cache hit.
  const packs = useQuery<CoursePackRow[]>({
    queryKey: ['course-packs'],
    queryFn: () => api<CoursePackRow[]>('/course-packs'),
  });
  const artCourses = (packs.data ?? []).filter((p) => p.product_line === ART_COURSE_LINE);
  const allGuidedTasks = guidedTasks.data ?? [];
  const firstDrawingTasks = allGuidedTasks.filter(
    (task) => task.progression?.level === 'first',
  );
  const simpleDrawingTasks = allGuidedTasks.filter(
    (task) => task.progression?.level === 'simple',
  );
  const challengeDrawingTasks = allGuidedTasks.filter(
    (task) => task.progression?.level === 'challenge',
  );

  // Only images belong in the picture wall — the bucket can also hold the
  // non-image artifacts a future studio feature saves.
  const allPictures = (pictures.data ?? []).filter((a) => a.kind === 'image');
  const shown = allPictures.slice(0, HUB_PICTURE_LIMIT);
  const latest = allPictures[0];
  const completedSlugs = completedTaskSlugs(
    allPictures,
    new Map(allGuidedTasks.map((task) => [task.slug, task])),
  );
  const nextTask = nextDrawingTask(allGuidedTasks, allPictures);

  // Reopening a saved picture is the SAME contract the "Keep drawing" menu item
  // in My Pictures uses: the artifact becomes the canvas base.
  const keepDrawing = (artifact: Artifact) =>
    nav(ART_CANVAS_PATH, {
      state: { editArtifactId: artifact.id, editProjectId: artifact.project_id },
    });

  const startMission = (row: ArtMissionRow) =>
    nav(
      artTaskSlugFromSteps(row.steps ?? [])
        ? `${ART_CANVAS_PATH}?task=${encodeURIComponent(
            artTaskSlugFromSteps(row.steps ?? []) as string,
          )}&mode=look`
        : ART_CANVAS_PATH,
      {
        state: {
          mission: {
            id: row.id,
            slug: row.slug,
            title: row.title,
            description: row.description,
            steps: row.steps,
            art_task_slug: artTaskSlugFromSteps(row.steps ?? []),
            template: row.art?.template,
            draw_along: row.art?.draw_along,
            checklist: row.art?.checklist,
          } satisfies ArtMission,
        },
      },
    );

  const startGuidedTask = (mode: ArtTaskDrawMode) => {
    if (!pickedTask) return;
    nav(`${ART_CANVAS_PATH}?task=${encodeURIComponent(pickedTask.slug)}&mode=${mode}`);
  };

  return (
    <div>
      <div className="mb-8 max-w-4xl">
        <div className="eyebrow eyebrow-bubblegum">Art Studio · Draw + AI</div>
        <h1 className="hero-display">
          Your art lives here. <span className="squiggle-word">Pick up where you left off.</span>
        </h1>
        <p className="lead-text mt-4">
          Draw something new, finish a task from your course, or reopen any picture you have made
          and keep drawing on it. Drawing is always free.
        </p>
      </div>

      {/* Primary actions: a new drawing, and (when there is one) the last picture. */}
      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          data-testid="art-hub-new"
          onClick={() => nav(ART_CANVAS_PATH, { state: { newCanvas: true } })}
          className="rounded-[26px] border-2 border-dashed border-brand-bubblegum/50 bg-wash-bubblegum p-6 text-left transition hover:-translate-y-0.5 hover:shadow-card-soft"
        >
          <div className="text-[40px]" aria-hidden="true">
            🎨
          </div>
          <h2 className="mt-2 text-[22px] font-black">Draw a new picture</h2>
          <p className="mt-1 text-[13px] font-semibold text-slate2">
            A blank canvas with brushes, colours and stickers. Free.
          </p>
        </button>

        {latest && (
          <button
            type="button"
            data-testid="art-hub-continue"
            onClick={() => keepDrawing(latest)}
            className="rounded-[26px] border border-brand-mint/35 bg-wash-mint p-6 text-left transition hover:-translate-y-0.5 hover:shadow-card-soft"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate2">
              Continue where you left off
            </div>
            <h2 className="mt-1 text-[22px] font-black">Keep drawing your last picture</h2>
            <p className="mt-1 text-[13px] font-semibold text-slate2">
              Made {formatDistanceToNow(new Date(latest.created_at), { addSuffix: true })}.
            </p>
          </button>
        )}
      </section>

      {nextTask && (
        <section
          className="mb-10 rounded-[28px] border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="art-next-task"
        >
          <div className="eyebrow eyebrow-mint">Your next drawing</div>
          <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              src={nextTask.cover.url}
              alt={nextTask.cover.alt}
              className="h-28 w-36 rounded-2xl bg-canvas-pure object-contain"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-black uppercase tracking-[0.1em] text-brand-bubblegum">
                {nextTask.progression?.path_title} · Step {nextTask.progression?.position} of{' '}
                {nextTask.progression?.total}
              </p>
              <h2 className="mt-1 text-[24px] font-black text-ink">{nextTask.title}</h2>
              <p className="mt-1 text-[13px] font-semibold text-slate2">
                You finished the last one. This is the one new skill that comes next.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPickedTask(nextTask)}
              className="btn-pill-primary shrink-0"
            >
              Draw this next →
            </button>
          </div>
        </section>
      )}

      <section className="mb-10" data-testid="art-hub-guided-tasks">
        <div className="eyebrow eyebrow-mint">Pick something to draw</div>
        <h2 className="section-heading mt-1">Drawing ideas</h2>
        <p className="lead-text mt-2">
          Choose a real thing, then look, trace or make your own version. Each idea has one small
          step at a time.
        </p>
        {guidedTasks.isLoading ? (
          <p className="lead-text mt-3">Loading drawing ideas…</p>
        ) : guidedTasks.data && guidedTasks.data.length > 0 ? (
          <div className="mt-5 space-y-8">
            {firstDrawingTasks.length > 0 && (
              <div data-testid="art-guided-first">
                <h3 className="text-[18px] font-black text-ink">My First Drawing</h3>
                <p className="mt-1 text-[13px] font-semibold text-slate2">
                  Just three tiny steps and a few big shapes — easiest to copy.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {firstDrawingTasks.map((task) => (
                    <DrawingIdeaCard
                      key={task.slug}
                      task={task}
                      completed={completedSlugs.has(task.slug)}
                      onPick={setPickedTask}
                    />
                  ))}
                </div>
              </div>
            )}

            {simpleDrawingTasks.length > 0 && (
              <div data-testid="art-guided-simple">
                <h3 className="text-[18px] font-black text-ink">Start Simple</h3>
                <p className="mt-1 text-[13px] font-semibold text-slate2">
                  Four big steps and clear lines — a friendly place to begin.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {simpleDrawingTasks.map((task) => (
                    <DrawingIdeaCard
                      key={task.slug}
                      task={task}
                      completed={completedSlugs.has(task.slug)}
                      onPick={setPickedTask}
                    />
                  ))}
                </div>
              </div>
            )}

            {challengeDrawingTasks.length > 0 && (
              <div data-testid="art-guided-challenge">
                <h3 className="text-[18px] font-black text-ink">Ready for a Challenge?</h3>
                <p className="mt-1 text-[13px] font-semibold text-slate2">
                  Five steps with more detail, colour and a bigger scene to create.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {challengeDrawingTasks.map((task) => (
                    <DrawingIdeaCard
                      key={task.slug}
                      task={task}
                      completed={completedSlugs.has(task.slug)}
                      onPick={setPickedTask}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-hairline bg-surface px-5 py-4">
            <p className="text-[14px] font-semibold text-ink">
              New drawing ideas are being prepared.
            </p>
            <p className="mt-1 text-[13px] text-ink-soft">
              You can still start with a blank canvas.
            </p>
          </div>
        )}
      </section>

      {/* ── 课程任务 — tasks that come from the kid's courses. */}
      <section className="mb-10" data-testid="art-hub-tasks">
        <h2 className="section-heading">Tasks from my courses</h2>
        {missions.isLoading ? (
          <p className="lead-text mt-2">Loading your tasks…</p>
        ) : missions.data && missions.data.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {missions.data.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  data-testid="art-hub-task"
                  onClick={() => startMission(row)}
                  className="group flex w-full items-start gap-3 rounded-2xl border border-hairline bg-canvas-pure px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-brand-bubblegum/40 hover:shadow-card-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-bubblegum"
                >
                  <span className="mt-0.5 shrink-0 text-[15px]" aria-hidden="true">
                    🎯
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-ink">{row.title}</span>
                    {row.description && (
                      <span className="mt-1 block text-[13px] text-ink-soft">
                        {row.description}
                      </span>
                    )}
                    <span className="mt-2 block text-[12px] font-bold uppercase tracking-[0.10em] text-slate2">
                      {publicCourseTitle(row.course_pack)} · {row.lesson.title} ·{' '}
                      {row.estimated_stars}★
                    </span>
                    <span className="mt-1 block text-[12px] font-semibold text-brand-bubblegum">
                      Open the task to see every learning step beside your canvas.
                    </span>
                  </span>
                  <span className="btn-pill-primary shrink-0" aria-hidden="true">
                    Start →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-2xl border border-hairline bg-surface px-5 py-4">
            <p className="text-[14px] font-semibold text-ink">No art task set for you yet.</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              Art tasks arrive with your courses. Until then, every drawing you make here is yours
              to keep.
            </p>
            <Link to="/learn/missions" className="btn-pill-secondary mt-4 inline-block">
              Browse my courses →
            </Link>
          </div>
        )}
      </section>

      {pickedTask && (
        <ArtTaskModePicker
          task={pickedTask}
          onPick={startGuidedTask}
          onClose={() => setPickedTask(null)}
        />
      )}

      {/* ── 课程 — the making/creative courses that live next to this studio. A task
          answers "what do I do next"; a course answers "what can I learn here". */}
      {artCourses.length > 0 && (
        <section className="mb-10" data-testid="art-hub-courses">
          <h2 className="section-heading">Art courses</h2>
          <p className="lead-text mt-2">
            Whole courses about making things. Each one is a run of lessons with a task in every
            lesson.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artCourses.map((pack) => {
              const taskCount = pack.lessons.reduce((n, l) => n + (l.missions?.length ?? 0), 0);
              return (
                <Link
                  key={pack.id}
                  to={`/learn/missions/${pack.slug}`}
                  data-testid="art-hub-course"
                  className="card-base block transition hover:-translate-y-0.5 hover:shadow-card-soft"
                >
                  <div className="text-[11px] font-black uppercase tracking-[0.12em] text-slate2">
                    Ages {pack.target_age_min}–{pack.target_age_max}
                  </div>
                  <h3 className="mt-1 text-[18px] font-black text-ink">
                    {publicCourseTitle(pack)}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-[13px] text-ink-soft">{pack.description}</p>
                  <div className="mt-3 text-[12px] font-bold uppercase tracking-[0.10em] text-slate2">
                    {pack.lessons.length} {pack.lessons.length === 1 ? 'lesson' : 'lessons'}
                    {taskCount > 0 &&
                      ` · ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`} ·{' '}
                    {pack.estimated_stars}★
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── 学习 — what the studio can do, and what each AI power costs. */}
      <section className="mb-10" data-testid="art-hub-learn">
        <h2 className="section-heading">How the Art Studio works</h2>
        <p className="lead-text mt-2">
          You draw first. AI only starts when you press one of these — and each one shows its price
          before it runs.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {AI_POWERS.map((power) => (
            <div key={power.title} className="card-base">
              <div className="text-[32px]" aria-hidden="true">
                {power.emoji}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <h3 className="text-[16px] font-black text-ink">{power.title}</h3>
                <span className="text-[12px] font-bold text-slate2">{power.cost}★</span>
              </div>
              <p className="mt-1 text-[13px] text-ink-soft">{power.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 作品 — every picture the kid has made. The thing that was invisible. */}
      <section className="pb-10" data-testid="art-hub-works">
        <div className="flex items-end justify-between gap-4">
          <h2 className="section-heading">My pictures</h2>
          {allPictures.length > shown.length && (
            <Link
              to="/learn/projects"
              className="text-[13px] font-bold text-ink-soft underline hover:text-ink"
            >
              See all {allPictures.length} →
            </Link>
          )}
        </div>

        {pictures.isLoading ? (
          <p className="lead-text mt-2">Loading your pictures…</p>
        ) : shown.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-hairline bg-surface px-5 py-4">
            <p className="text-[14px] font-semibold text-ink">You have not made a picture yet.</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              Everything you draw saves here on its own — you never have to remember to save.
            </p>
          </div>
        ) : (
          <>
            <p className="lead-text mt-2">
              Tap any picture to open it on the canvas and keep drawing.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((artifact) => (
                <PictureCard
                  key={artifact.id}
                  artifact={artifact}
                  onOpen={() => keepDrawing(artifact)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
