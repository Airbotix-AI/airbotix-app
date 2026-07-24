// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { CourseDetailPage } from './CourseDetailPage';

const DETAIL = {
  slug: 'rhythm-game',
  title: 'Build a Rhythm Game with AI',
  series: 'Game Studio',
  page_type: 'template',
  cover_image_url: null,
  seo: {
    name: 'Build a Rhythm Game with AI',
    description: 'A practical AI coding workshop.',
  },
  page_config: {
    promiseHtml: 'Build a <strong>playable music game</strong> with AI.',
    ageRange: '9–14',
    weeksCount: 1,
    format: 'workshop',
    cardBlurb: 'A fast, practical game-building workshop.',
    aiTracksIntro: 'Kids practise prompting, testing and improving.',
    aiTracks: [
      {
        tone: 'coral',
        icon: '🎵',
        title: 'Prompt a game idea',
        body: 'Turn a creative idea into clear instructions for AI.',
      },
    ],
    syllabusIntro: 'The workshop moves from idea to a playable result.',
    sessionAgenda: [
      {
        time: '0–20 min',
        title: 'Design the beat',
        focus: 'Choose a rhythm and game rule.',
        ai: 'Prompting with constraints',
        ship: 'A working beat loop',
      },
    ],
    weeks: [],
    outcomes: ['A playable rhythm game', 'A repeatable AI build process'],
    faqs: [
      {
        q: 'Does my child need coding experience?',
        a: '<strong>No.</strong> Beginners are welcome.',
      },
    ],
    priceLabel: 'A$60',
    priceNote: 'One 90-minute workshop',
    sessionLength: '90 min',
    cohortSize: 'Up to 10 kids',
    formatBlurb: 'One face-to-face guided workshop.',
    toolsBlurb: 'Bring a laptop with a modern browser.',
  },
};

const CLASSES = [
  {
    id: 'local_rhythm_game_20260726',
    name: 'Build a Rhythm Game with AI - Workshop',
    delivery_mode: 'workshop',
    starts_at: '2026-07-26T10:39:00Z',
    ends_at: '2026-07-26T12:09:00Z',
    max_students: 10,
    seats_remaining: 10,
    venue: {
      name: 'Airbotix Brisbane Studio',
      address_line: 'Brisbane City',
      suburb: 'Brisbane City',
      city: 'Brisbane',
      state: 'QLD',
      postcode: '4000',
      country: 'AU',
    },
    course_total_aud_cents: 6000,
    session_count: 1,
    session_minutes: 90,
    purchasable: true,
    teaching_team: [],
  },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/portal/courses/rhythm-game']}>
        <Routes>
          <Route path="/portal/courses/:courseSlug" element={<CourseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderCourse(courseSlug: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/portal/courses/${courseSlug}`]}>
        <Routes>
          <Route path="/portal/courses/:courseSlug" element={<CourseDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CourseDetailPage', () => {
  it('renders the authoritative course story, outline, outcomes, FAQ and bookable class', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/courses/rhythm-game') return Promise.resolve(DETAIL);
      if (path === '/courses/rhythm-game/classes') return Promise.resolve(CLASSES);
      if (path === '/course-packs?bookable=true') {
        return Promise.resolve([
          {
            id: 'pack-1',
            slug: 'rhythm-game',
            title: 'Rhythm Game',
            description: 'Fallback description.',
            target_age_min: 9,
            target_age_max: 14,
            lessons: [{ id: 'lesson-1', title: 'Build the game' }],
          },
        ]);
      }
      return Promise.resolve([]);
    });

    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Build a Rhythm Game with AI' }),
    ).toBeVisible();
    expect(screen.getByText('Build a playable music game with AI.')).toBeVisible();
    expect(screen.getByText('Prompt a game idea')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Design the beat' })).toBeVisible();
    expect(screen.getByTestId('course-current-price')).toHaveTextContent('A$60');
    expect(screen.getByTestId('course-current-price')).toHaveTextContent('current open class');
    expect(screen.getByText('A playable rhythm game')).toBeVisible();
    expect(screen.getByText('Does my child need coding experience?')).toBeVisible();
    expect(
      await screen.findByRole('heading', { name: 'Build a Rhythm Game with AI - Workshop' }),
    ).toBeVisible();
    expect(screen.getByText('10 of 10 available')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Pay & lock a seat' })).toHaveAttribute(
      'href',
      '/portal/checkout/class/local_rhythm_game_20260726',
    );
    expect(api).toHaveBeenCalledWith('/courses/rhythm-game');
    expect(api).toHaveBeenCalledWith('/courses/rhythm-game/classes');
  });

  it('keeps a useful fallback when the public course record cannot be loaded', async () => {
    api.mockRejectedValue(new Error('offline'));

    renderPage();

    expect(await screen.findByText('Course unavailable')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Browse courses' })).toHaveAttribute(
      'href',
      '/portal/courses',
    );
  });

  it('uses authored weeks as a workshop plan when no separate session agenda exists', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/courses/rhythm-game') {
        return Promise.resolve({
          ...DETAIL,
          page_config: {
            ...DETAIL.page_config,
            sessionAgenda: undefined,
            weeks: [
              {
                n: 1,
                time: '0–15 min',
                title: 'Meet the beat',
                focus: 'Hear the rhythm and choose the hero.',
                ai: 'Describe a game idea',
                ship: 'A clear game brief',
              },
            ],
          },
        });
      }
      if (path === '/courses/rhythm-game/classes') return Promise.resolve([]);
      if (path === '/course-packs?bookable=true') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'Meet the beat' })).toBeVisible();
    expect(screen.getByText('0–15 min')).toBeVisible();
  });

  it('shows every authored weekly image from the marketing course source', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/courses/super-mario-game') {
        return Promise.resolve({
          ...DETAIL,
          slug: 'super-mario-game',
          title: 'Build a Super Mario Game with AI',
          cover_image_url: '/media/courses/super-mario-game.png',
          page_config: {
            ...DETAIL.page_config,
            format: 'weekly',
            weeksCount: 2,
            sessionAgenda: undefined,
            weeks: [
              {
                n: 1,
                title: 'Design your hero & world',
                focus: 'Choose the hero and world.',
                ai: 'AI concept art',
                ship: 'A title screen',
                image: '/media/courses/super-mario-game-week-01.png',
                imageAlt: 'Original robot-cat hero concept art',
              },
              {
                n: 2,
                title: 'Make it move',
                focus: 'Build movement.',
                ai: 'AI animation',
                ship: 'A moving hero',
                image: 'https://cdn.example.com/super-mario-week-02.png',
                imageAlt: 'Original robot-cat hero moving',
              },
            ],
          },
        });
      }
      if (path === '/courses/super-mario-game/classes') return Promise.resolve([]);
      if (path === '/course-packs?bookable=true') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderCourse('super-mario-game');

    expect(
      await screen.findByRole('heading', { name: 'Build a Super Mario Game with AI' }),
    ).toBeVisible();
    expect(
      screen.getByRole('img', { name: 'Original robot-cat hero concept art' }),
    ).toHaveAttribute('src', 'http://localhost:3000/media/courses/super-mario-game-week-01.png');
    expect(screen.getByRole('img', { name: 'Original robot-cat hero moving' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/super-mario-week-02.png',
    );
    expect(screen.getAllByTestId('course-outline-image')).toHaveLength(2);
  });
});
