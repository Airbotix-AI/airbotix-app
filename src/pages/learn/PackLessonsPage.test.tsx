// @vitest-environment jsdom
// Pack detail (/learn/missions/:slug) under the Lesson(content)/Mission(task) split:
// a pack renders its ordered Lessons (课节), and each Lesson renders its kid-facing
// Mission task(s). FE-only — `@/lib/api` is mocked (no network).

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { PackLessonsPage } from './PackLessonsPage';

const PACK = {
  id: 'p1',
  slug: 'creative-starter',
  title: 'Creative Starter',
  description: 'A gentle intro.',
  target_age_min: 7,
  target_age_max: 9,
  product_line: 'line_a_creative' as const,
  estimated_stars: 30,
  lessons: [
    {
      id: 'l1',
      slug: 'first-lesson',
      title: 'First Lesson',
      description: 'Warm up.',
      order_index: 0,
      missions: [
        {
          id: 'm1',
          slug: 'draw-a-cat',
          title: 'Draw a cat',
          description: 'Make a picture.',
          estimated_stars: 5,
          order_index: 0,
        },
      ],
    },
  ],
};

function renderPack() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/learn/missions/creative-starter']}>
        <Routes>
          <Route path="/learn/missions/:id" element={<PackLessonsPage />} />
          {/* An art task goes straight to the CANVAS, past the hub (D-IS-28). */}
          <Route path="/learn/create/image/canvas" element={<ArtMissionTarget />} />
          <Route path="/learn/create/image" element={<div data-testid="art-hub-route" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function ArtMissionTarget() {
  const location = useLocation();
  return (
    <>
      <pre data-testid="art-mission-state">{JSON.stringify(location.state)}</pre>
      <span data-testid="art-mission-search">{location.search}</span>
    </>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PackLessonsPage (pack → Lessons → Mission tasks)', () => {
  it('renders the pack content count as a count of Lessons (课节), not Mission tasks', async () => {
    api.mockResolvedValue(PACK);
    renderPack();
    // 1 Lesson in the pack — the headline count is lessons.length, singular.
    expect(await screen.findByText(/1 lesson · 30★ total/)).toBeInTheDocument();
  });

  it('renders each Lesson and its nested kid Mission task(s)', async () => {
    api.mockResolvedValue(PACK);
    renderPack();
    expect(await screen.findByText('First Lesson')).toBeInTheDocument();
    // The Mission task lives inside the Lesson with a Start button.
    const task = (await screen.findByText('Draw a cat')).closest('li');
    expect(task).not.toBeNull();
    expect(within(task as HTMLElement).getByText(/5★ to complete/)).toBeInTheDocument();
    expect(within(task as HTMLElement).getByRole('button', { name: /Start/ })).toBeInTheDocument();
  });

  it('opens an art task in Mission Mode with its template config', async () => {
    api.mockResolvedValue({
      ...PACK,
      lessons: [
        {
          ...PACK.lessons[0],
          missions: [
            {
              ...PACK.lessons[0].missions[0],
              steps_json: {
                art: {
                  template: {
                    url: '/templates/robot.png',
                    layer: 'underlay',
                    magic: 'strokes-only',
                  },
                },
              },
            },
          ],
        },
      ],
    });
    renderPack();
    const task = (await screen.findByText('Draw a cat')).closest('li');
    fireEvent.click(within(task as HTMLElement).getByRole('button', { name: /Start/ }));
    expect(await screen.findByTestId('art-mission-state')).toHaveTextContent(
      JSON.stringify({
        mission: {
          id: 'm1',
          slug: 'draw-a-cat',
          title: 'Draw a cat',
          description: 'Make a picture.',
          steps: [],
          template: {
            url: '/templates/robot.png',
            layer: 'underlay',
            magic: 'strokes-only',
          },
        },
      }),
    );
  });

  it('opens a steps-array image task in Art Studio with its learning sequence', async () => {
    const steps = [
      {
        id: 'hero',
        title: "Your hero's character sheet",
        instruction_md: 'Draw front, side and jumping poses.',
        widget: 'image_create',
      },
      {
        id: 'world',
        title: 'Pick your world',
        instruction_md: 'Choose where the adventure happens.',
        widget: 'choice',
      },
    ];
    api.mockResolvedValue({
      ...PACK,
      lessons: [
        {
          ...PACK.lessons[0],
          missions: [{ ...PACK.lessons[0].missions[0], steps_json: steps }],
        },
      ],
    });
    renderPack();
    const task = (await screen.findByText('Draw a cat')).closest('li');
    fireEvent.click(within(task as HTMLElement).getByRole('button', { name: /Start/ }));
    expect(await screen.findByTestId('art-mission-state')).toHaveTextContent(
      JSON.stringify({
        mission: {
          id: 'm1',
          slug: 'draw-a-cat',
          title: 'Draw a cat',
          description: 'Make a picture.',
          steps,
        },
      }),
    );
  });

  it('reuses an approved guided task without leaving Art Studio Mission Mode', async () => {
    const steps = [
      {
        id: 'dinosaur',
        title: 'Draw your dinosaur',
        instruction_md: 'Follow the guide, then make it yours.',
        widget: 'image_create',
        widget_config: {
          art_task_slug: 'draw-a-trex',
          allowed_modes: ['look_and_draw', 'trace_ghost', 'draw_my_way'],
        },
      },
    ];
    api.mockResolvedValue({
      ...PACK,
      lessons: [
        {
          ...PACK.lessons[0],
          missions: [{ ...PACK.lessons[0].missions[0], steps_json: steps }],
        },
      ],
    });
    renderPack();

    const task = (await screen.findByText('Draw a cat')).closest('li');
    fireEvent.click(within(task as HTMLElement).getByRole('button', { name: /Start/ }));

    expect(await screen.findByTestId('art-mission-search')).toHaveTextContent(
      '?task=draw-a-trex&mode=look',
    );
    expect(screen.getByTestId('art-mission-state')).toHaveTextContent(
      JSON.stringify({
        mission: {
          id: 'm1',
          slug: 'draw-a-cat',
          title: 'Draw a cat',
          description: 'Make a picture.',
          steps,
          art_task_slug: 'draw-a-trex',
        },
      }),
    );
  });

  it.each([
    ['your-hero-your-world', 'Your hero & your world'],
    ['the-story-in-panels', 'The story in panels'],
    ['draw-every-page', 'Draw every page'],
    ['print-it-and-launch-it', 'Print it & launch it'],
  ])(
    'keeps the legacy AI Comic Book task %s inside Art Studio even before steps are authored',
    async (missionSlug, missionTitle) => {
      api.mockResolvedValue({
        ...PACK,
        slug: 'ai-comic-book',
        title: 'Create Your Own Comic Book with AI',
        lessons: [
          {
            ...PACK.lessons[0],
            missions: [
              {
                ...PACK.lessons[0].missions[0],
                slug: missionSlug,
                title: missionTitle,
                steps_json: [],
              },
            ],
          },
        ],
      });
      renderPack();

      const task = (await screen.findByText(missionTitle)).closest('li');
      fireEvent.click(within(task as HTMLElement).getByRole('button', { name: /Start/ }));

      expect(await screen.findByTestId('art-mission-state')).toHaveTextContent(
        JSON.stringify({
          mission: {
            id: 'm1',
            slug: missionSlug,
            title: missionTitle,
            description: 'Make a picture.',
            steps: [],
          },
        }),
      );
      expect(screen.queryByTestId('art-hub-route')).not.toBeInTheDocument();
    },
  );
});
