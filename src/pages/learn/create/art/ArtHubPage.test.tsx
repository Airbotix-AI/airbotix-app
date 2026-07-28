// @vitest-environment jsdom

// Art Studio hub (image-studio-prd D-IS-28). The bug it fixes: `/learn/create/image`
// opened a blank canvas, so the kid's previous pictures were invisible from the
// studio entirely. These specs pin the three sections the hub owes the kid —
// tasks / how-it-works / my pictures — and that every route out of it lands on the
// CANVAS (`/learn/create/image/canvas`) carrying the right router state.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ApiCall {
  path: string;
  opts?: { method?: string };
}
const apiCalls: ApiCall[] = [];

// What the fake backend hands back — reassigned per test to exercise the empty states.
let artifacts: Array<Record<string, unknown>> = [];
let artMissions: Array<Record<string, unknown>> = [];
let coursePacks: Array<Record<string, unknown>> = [];
let guidedTasks: Array<Record<string, unknown>> = [];

vi.mock('@/lib/api', () => ({
  BASE_URL: 'http://api.test',
  api: vi.fn((path: string, opts?: { method?: string }) => {
    apiCalls.push({ path, opts });
    if (path.endsWith('/create-buckets/resolve')) {
      return Promise.resolve({ project_id: 'proj_bucket', title: 'My Pictures' });
    }
    if (path === '/projects/proj_bucket/artifacts') return Promise.resolve(artifacts);
    if (path === '/course-packs/art-missions') return Promise.resolve(artMissions);
    if (path === '/art-studio/tasks') return Promise.resolve(guidedTasks);
    if (path === '/course-packs') return Promise.resolve(coursePacks);
    if (path.includes('/download-url')) return Promise.resolve({ url: 'https://signed/pic.png' });
    return Promise.resolve({});
  }),
}));

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid_1', family_id: 'fam_1' } }),
}));

import { ArtHubPage } from './ArtHubPage';

const picture = (over: Record<string, unknown> = {}) => ({
  id: 'art_1',
  kind: 'image',
  s3_key: 'k',
  mime_type: 'image/png',
  size_bytes: 10,
  created_at: '2026-07-24T02:00:00.000Z',
  project_id: 'proj_bucket',
  metadata: { source: 'canvas-sketch' },
  ...over,
});

const artMission = (over: Record<string, unknown> = {}) => ({
  id: 'm_art_1',
  slug: 'draw-your-robot',
  title: 'Draw your robot',
  description: 'A robot with a happy face!',
  estimated_stars: 9,
  steps: [
    {
      id: 'step_1',
      title: "Your hero's character sheet",
      instruction_md: 'Draw the same hero from three sides.',
      widget: 'image_create',
    },
  ],
  art: { checklist: ['a robot'], draw_along: ['a big circle'] },
  lesson: { id: 'L1', title: 'Robot friends', order_index: 0 },
  course_pack: { slug: 'ai-comic-book', title: 'AI Comic Book', product_line: 'line_a_creative' },
  ...over,
});

const coursePack = (over: Record<string, unknown> = {}) => ({
  id: 'p_art',
  slug: 'ai-art-studio',
  title: 'AI Art Studio',
  description: 'Draw, direct and hang your own gallery show.',
  target_age_min: 6,
  target_age_max: 9,
  product_line: 'line_a_creative',
  estimated_stars: 160,
  lessons: [
    { id: 'L1', title: 'Meet your magic canvas', missions: [{ id: 'm1' }] },
    { id: 'L2', title: 'Trace like an artist', missions: [{ id: 'm2' }] },
  ],
  ...over,
});

// Captures where the hub navigated to, and what it carried, without a real router.
let landed: { pathname: string; search: string; state: unknown } | null = null;
function CanvasProbe() {
  const loc = useLocation();
  landed = { pathname: loc.pathname, search: loc.search, state: loc.state };
  return <div data-testid="canvas-route" />;
}

function renderHub() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/learn/create/image']}>
      <QueryClientProvider client={qc}>
        <Routes>
          <Route path="/learn/create/image" element={<ArtHubPage />} />
          <Route path="/learn/create/image/canvas" element={<CanvasProbe />} />
          <Route path="*" element={<div data-testid="other-route" />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  apiCalls.length = 0;
  landed = null;
  artifacts = [];
  artMissions = [];
  coursePacks = [];
  guidedTasks = [];
});
afterEach(cleanup);

describe('ArtHubPage — my pictures (the thing that was invisible)', () => {
  it('shows the pictures already saved in the kid’s bucket', async () => {
    artifacts = [
      picture({ id: 'art_1', metadata: { source: 'canvas-sketch' } }),
      picture({ id: 'art_2', metadata: { prompt: 'a purple dragon' } }),
    ];
    renderHub();
    await waitFor(() => expect(screen.getAllByTestId('art-hub-picture')).toHaveLength(2));
    expect(screen.getByText('a purple dragon')).toBeInTheDocument();
    // The kid's own strokes and an AI take must be told apart at a glance.
    expect(screen.getByText('✏️ I drew it')).toBeInTheDocument();
    expect(screen.getByText('✨ AI')).toBeInTheDocument();
  });

  it('opens a saved picture on the CANVAS as the base to keep drawing', async () => {
    artifacts = [picture({ id: 'art_7' })];
    renderHub();
    await waitFor(() => expect(screen.getAllByTestId('art-hub-picture')).toHaveLength(1));
    fireEvent.click(screen.getAllByTestId('art-hub-picture')[0]);
    await waitFor(() => expect(screen.getByTestId('canvas-route')).toBeInTheDocument());
    expect(landed).toEqual({
      pathname: '/learn/create/image/canvas',
      search: '',
      // Same contract as the "Keep drawing" menu item in My Pictures.
      state: { editArtifactId: 'art_7', editProjectId: 'proj_bucket' },
    });
  });

  it('offers the newest picture as "continue where you left off"', async () => {
    artifacts = [picture({ id: 'newest' }), picture({ id: 'older' })];
    renderHub();
    await waitFor(() => expect(screen.getByTestId('art-hub-continue')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('art-hub-continue'));
    await waitFor(() =>
      expect(landed?.state).toEqual({
        editArtifactId: 'newest',
        editProjectId: 'proj_bucket',
      }),
    );
  });

  it('hides the continue card and explains auto-save when nothing is drawn yet', async () => {
    renderHub();
    await waitFor(() =>
      expect(screen.getByText('You have not made a picture yet.')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('art-hub-continue')).not.toBeInTheDocument();
  });

  // Non-image artifacts can share the bucket; they are not pictures.
  it('keeps non-image artifacts out of the picture wall', async () => {
    artifacts = [picture({ id: 'a_img' }), picture({ id: 'a_aud', kind: 'audio' })];
    renderHub();
    await waitFor(() => expect(screen.getAllByTestId('art-hub-picture')).toHaveLength(1));
  });

  it('defers the long tail to My Pictures instead of loading every thumbnail', async () => {
    artifacts = Array.from({ length: 15 }, (_, i) => picture({ id: `art_${i}` }));
    renderHub();
    await waitFor(() => expect(screen.getAllByTestId('art-hub-picture')).toHaveLength(12));
    expect(screen.getByText('See all 15 →')).toHaveAttribute('href', '/learn/projects/proj_bucket');
  });
});

describe('ArtHubPage — art tasks', () => {
  it('lists art tasks with the course and lesson they came from', async () => {
    artMissions = [artMission()];
    renderHub();
    await waitFor(() => expect(screen.getByTestId('art-hub-task')).toBeInTheDocument());
    expect(screen.getByText('Draw your robot')).toBeInTheDocument();
    expect(
      screen.getByText(/Create Your Own Comic Book with AI · Robot friends · 9★/),
    ).toBeInTheDocument();
  });

  it('starts a task by clicking anywhere on the card and carries its learning steps', async () => {
    artMissions = [artMission()];
    renderHub();
    await waitFor(() => expect(screen.getByTestId('art-hub-task')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('art-hub-task'));
    await waitFor(() => expect(screen.getByTestId('canvas-route')).toBeInTheDocument());
    expect(landed?.pathname).toBe('/learn/create/image/canvas');
    expect(landed?.state).toEqual({
      mission: {
        id: 'm_art_1',
        slug: 'draw-your-robot',
        title: 'Draw your robot',
        description: 'A robot with a happy face!',
        steps: [
          {
            id: 'step_1',
            title: "Your hero's character sheet",
            instruction_md: 'Draw the same hero from three sides.',
            widget: 'image_create',
          },
        ],
        template: undefined,
        draw_along: ['a big circle'],
        checklist: ['a robot'],
      },
    });
  });

  // The real catalogue shape: a "hand in a picture" task that carries no Mission
  // Mode template. It must still be startable — the studio opens Mission Mode
  // without a template. (Filtering on the template alone left the hub empty.)
  it('starts an acceptance-only task that has no Mission Mode config', async () => {
    artMissions = [artMission({ art: null, title: 'Design your hero & world' })];
    renderHub();
    await waitFor(() => expect(screen.getByTestId('art-hub-task')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('art-hub-task'));
    await waitFor(() => expect(screen.getByTestId('canvas-route')).toBeInTheDocument());
    expect(landed?.state).toEqual({
      mission: {
        id: 'm_art_1',
        slug: 'draw-your-robot',
        title: 'Design your hero & world',
        description: 'A robot with a happy face!',
        steps: [
          {
            id: 'step_1',
            title: "Your hero's character sheet",
            instruction_md: 'Draw the same hero from three sides.',
            widget: 'image_create',
          },
        ],
        template: undefined,
        draw_along: undefined,
        checklist: undefined,
      },
    });
  });

  // No art mission has been authored yet in production — the section must say so
  // honestly and point somewhere useful rather than render an empty box.
  it('explains the empty task list and links to the courses', async () => {
    renderHub();
    await waitFor(() =>
      expect(screen.getByText('No art task set for you yet.')).toBeInTheDocument(),
    );
    expect(screen.getByText('Browse my courses →')).toHaveAttribute('href', '/learn/missions');
  });
});

describe('ArtHubPage — concrete drawing ideas', () => {
  it('shows all eight pilot choices instead of a single sample task', async () => {
    const titles = [
      'Draw a T-Rex',
      'Draw a Kitten',
      'Draw a Puppy',
      'Draw a Lion',
      'Draw a Shark',
      'Draw a Rocket',
      'Draw a Unicorn',
      'Draw a Race Car',
    ];
    guidedTasks = titles.map((title, index) => ({
      slug: `task-${index}`,
      version: 1,
      title,
      short_description: `Guided drawing ${index + 1}`,
      category: 'animals',
      age_min: 6,
      age_max: 10,
      difficulty: 1,
      duration_minutes: 12,
      cover: { url: `/art-tasks/task-${index}/v1/cover.png`, alt: title },
      modes: ['look_and_draw', 'trace_ghost', 'draw_my_way'],
    }));

    renderHub();

    expect(await screen.findAllByTestId('art-guided-task')).toHaveLength(8);
    titles.forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
  });

  it('lets a child pick a T-Rex and choose how to draw before opening the canvas', async () => {
    guidedTasks = [
      {
        slug: 'draw-a-trex',
        version: 1,
        title: 'Draw a T-Rex',
        short_description: 'Build a mighty dinosaur from big, simple shapes.',
        category: 'dinosaurs',
        age_min: 6,
        age_max: 10,
        difficulty: 1,
        duration_minutes: 12,
        cover: {
          url: '/art-tasks/draw-a-trex/v1/cover.png',
          alt: 'A friendly green T-Rex',
        },
        modes: ['look_and_draw', 'trace_ghost', 'draw_my_way'],
      },
    ];
    renderHub();

    fireEvent.click(await screen.findByTestId('art-guided-task'));
    expect(screen.getByTestId('art-task-mode-picker')).toHaveTextContent('Look & Draw');
    expect(screen.getByTestId('art-task-mode-picker')).toHaveTextContent('Trace a Ghost');
    expect(screen.getByTestId('art-task-mode-picker')).toHaveTextContent('Draw My Way');

    fireEvent.click(screen.getByRole('button', { name: /Trace a Ghost/ }));
    await waitFor(() => expect(screen.getByTestId('canvas-route')).toBeInTheDocument());
    expect(landed).toEqual({
      pathname: '/learn/create/image/canvas',
      search: '?task=draw-a-trex&mode=trace',
      state: null,
    });
  });
});

describe('ArtHubPage — art courses', () => {
  it('shows the making/creative courses with their lesson and task counts', async () => {
    coursePacks = [coursePack()];
    renderHub();
    await waitFor(() => expect(screen.getByTestId('art-hub-course')).toBeInTheDocument());
    expect(screen.getByText('AI Art Studio')).toBeInTheDocument();
    expect(screen.getByText(/2 lessons · 2 tasks · 160★/)).toBeInTheDocument();
    expect(screen.getByTestId('art-hub-course')).toHaveAttribute(
      'href',
      '/learn/missions/ai-art-studio',
    );
  });

  // Coding-line courses reach this hub only through their individual art TASKS —
  // listing "Super Mario Game" as an art course would be wrong.
  it('leaves coding-line courses out of the course list', async () => {
    coursePacks = [
      coursePack(),
      coursePack({
        id: 'p_mario',
        slug: 'super-mario-game',
        title: 'Super Mario Game',
        product_line: 'line_b_coding',
      }),
    ];
    renderHub();
    await waitFor(() => expect(screen.getAllByTestId('art-hub-course')).toHaveLength(1));
    expect(screen.queryByText('Super Mario Game')).not.toBeInTheDocument();
  });

  it('hides the whole course section when no creative course is published', async () => {
    coursePacks = [coursePack({ product_line: 'line_b_coding' })];
    renderHub();
    await waitFor(() => expect(screen.getByTestId('art-hub-learn')).toBeInTheDocument());
    expect(screen.queryByTestId('art-hub-courses')).not.toBeInTheDocument();
  });
});

describe('ArtHubPage — learning + new canvas', () => {
  it('teaches the three AI powers at the prices the canvas actually charges', async () => {
    renderHub();
    await waitFor(() => expect(screen.getByTestId('art-hub-learn')).toBeInTheDocument());
    // Must match ArtStudioPage GHOST_COST / CHAT_COST / MAGIC_COST.
    expect(screen.getByText('Ghost sketch').parentElement).toHaveTextContent('2★');
    expect(screen.getByText('Coach look').parentElement).toHaveTextContent('1★');
    expect(screen.getByText('Bring it to life').parentElement).toHaveTextContent('9★');
  });

  it('opens a blank canvas with no router state', async () => {
    renderHub();
    fireEvent.click(screen.getByTestId('art-hub-new'));
    await waitFor(() => expect(screen.getByTestId('canvas-route')).toBeInTheDocument());
    expect(landed).toEqual({ pathname: '/learn/create/image/canvas', search: '', state: null });
  });

  // The hub is a landing page: it must not spend Stars or start a generation.
  it('never calls a billed AI endpoint', async () => {
    artifacts = [picture()];
    artMissions = [artMission()];
    renderHub();
    await waitFor(() => expect(screen.getAllByTestId('art-hub-picture')).toHaveLength(1));
    expect(apiCalls.some((c) => c.path.startsWith('/llm/'))).toBe(false);
  });
});
