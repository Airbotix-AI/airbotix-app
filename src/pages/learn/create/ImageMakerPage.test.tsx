// @vitest-environment jsdom

// Art Studio (`/learn/create/image`) — ONE conversation (image-studio-prd.md
// D-IS-7/8, owner call 2026-07-19): coach chat (1★/turn) → paint-plan card IN
// the stream (9★ Make) → the finished picture lands as an image bubble IN the
// stream → the same input in "Change" mode remixes via ref_artifact_id (9★).
// No gallery grid on the page — history lives in My Pictures (footer link).

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface ApiCall {
  path: string;
  opts?: { method?: string; body?: Record<string, unknown> };
}
const apiCalls: ApiCall[] = [];

vi.mock('@/lib/api', () => ({
  api: vi.fn((path: string, opts?: { method?: string; body?: Record<string, unknown> }) => {
    apiCalls.push({ path, opts });
    if (path.endsWith('/create-buckets/resolve')) {
      return Promise.resolve({ project_id: 'proj_bucket', title: 'My Pictures' });
    }
    if (path === '/llm/image-plan') {
      const messages = (opts?.body?.messages ?? []) as Array<{ role: string; content: string }>;
      const kidTurns = messages.filter((m) => m.role === 'user');
      if (kidTurns.length < 2) {
        return Promise.resolve({
          reply: 'Where does it happen?',
          chips: ['In space', 'Underwater'],
          plan: null,
          stars_charged: 1,
          balance_after: 41,
        });
      }
      return Promise.resolve({
        reply: 'Ready to paint!',
        chips: [],
        plan: {
          prompt: kidTurns.map((m) => m.content).join(', '),
          style: 'cartoon',
          size: 'square',
        },
        stars_charged: 1,
        balance_after: 40,
      });
    }
    if (path === '/llm/image') {
      return Promise.resolve({
        id: 'gen_1',
        url: 'https://signed/img.webp',
        mime_type: 'image/webp',
        stars_charged: 8,
        balance_after: 34,
        artifact_id: 'art_1',
      });
    }
    if (path === '/projects/proj_bucket/artifacts') return Promise.resolve([]);
    if (path.endsWith('/download-url')) return Promise.resolve({ url: 'https://signed' });
    if (path.includes('/wallet')) {
      return Promise.resolve({ stars_balance: 42, daily_used: 0, daily_cap: 100, paused: false });
    }
    return Promise.resolve({});
  }),
  ApiError: class ApiError extends Error {
    constructor(
      public readonly status: number,
      public readonly code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid_1', family_id: 'fam_1' } }),
}));

vi.mock('./shared/useSession', () => ({
  useStudioSession: () => ({ summary: null, endNow: vi.fn(), dismiss: vi.fn() }),
}));

import { ImageMakerPage } from './ImageMakerPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <ImageMakerPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/** Drive the coach chat to a ready plan: idea → question → chip → plan card. */
async function chatToPlan() {
  fireEvent.change(screen.getByPlaceholderText(/friendly robot/i), {
    target: { value: 'a dragon' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Send −1★/ }));
  await screen.findByText('Where does it happen?');
  fireEvent.click(screen.getByRole('button', { name: 'In space' }));
  return await screen.findByTestId('paint-plan-card');
}

describe('ImageMakerPage (Art Studio — one conversation)', () => {
  beforeEach(() => {
    apiCalls.length = 0;
  });
  afterEach(cleanup);

  it('renders as Art Studio with the bucket footer link and NO gallery grid', async () => {
    renderPage();

    expect(screen.getAllByText('Art Studio').length).toBeGreaterThan(0);
    expect(screen.queryByText('Image Maker')).not.toBeInTheDocument();
    // the old form-page furniture is gone — this page is a conversation
    expect(screen.queryByText(/Your recent images/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Empty canvas/)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(
        apiCalls.some(
          (c) => c.path === '/kids/kid_1/create-buckets/resolve' && c.opts?.body?.tool === 'image',
        ),
      ).toBe(true);
    });
    expect(await screen.findByText(/saved in My Pictures/i)).toBeInTheDocument();
    expect(apiCalls.some((c) => c.path.startsWith('/kids/kid_1/artifacts'))).toBe(false);
  });

  it('coach chat (1★/turn) → plan card IN the stream → 9★ Make with project_id → image bubble', async () => {
    renderPage();
    const planCard = await chatToPlan();

    expect(apiCalls.filter((c) => c.path === '/llm/image-plan').length).toBe(2);
    expect(apiCalls.some((c) => c.path === '/llm/image')).toBe(false);
    expect(planCard).toHaveTextContent('Our paint plan');

    const makeBtn = screen.getByRole('button', { name: /Make it! −9★/ });
    await waitFor(() => expect(makeBtn).toBeEnabled());
    fireEvent.click(makeBtn);

    await waitFor(() => {
      const gen = apiCalls.find((c) => c.path === '/llm/image');
      expect(gen).toBeDefined();
      expect(gen!.opts?.body?.project_id).toBe('proj_bucket');
      expect(gen!.opts?.body?.prompt).toBe('a dragon, In space, cartoon style');
      expect((gen!.opts?.body?.options as Record<string, unknown>).size).toBe('square');
    });
    // the picture arrives as a message in the conversation
    expect(await screen.findByTestId('image-bubble')).toBeInTheDocument();
    expect(await screen.findByText('Your image is ready!')).toBeInTheDocument();
  });

  it('after making, the SAME input flips to Change mode (9★) and remixes with ref_artifact_id', async () => {
    renderPage();
    await chatToPlan();
    fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));
    await screen.findByTestId('image-bubble');

    // input is now in change mode: placeholder + price flip
    expect(screen.getByRole('button', { name: /Change this picture/ })).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/tiny hat/i), {
      target: { value: 'add a crown' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send −9★/ }));

    await waitFor(() => {
      const remix = apiCalls.filter((c) => c.path === '/llm/image')[1];
      expect(remix).toBeDefined();
      expect(remix!.opts?.body?.ref_artifact_id).toBe('art_1');
      expect(remix!.opts?.body?.prompt).toBe('add a crown');
    });
    // both the change instruction and the new picture are messages in the stream
    expect(screen.getByText('add a crown')).toBeInTheDocument();
    expect((await screen.findAllByTestId('image-bubble')).length).toBe(2);
  });

  it('"Plan something new" flips the input back to the 1★ coach', async () => {
    renderPage();
    await chatToPlan();
    fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));
    await screen.findByTestId('image-bubble');

    fireEvent.click(screen.getByRole('button', { name: /Plan something new/ }));
    expect(screen.getByRole('button', { name: /Send −1★/ })).toBeInTheDocument();
  });

  it('"skip the chat" opens a plan straight from what the kid said (no paid call)', async () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/friendly robot/i), {
      target: { value: 'a robot chef' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Send −1★/ }));
    await screen.findByText('Where does it happen?');

    fireEvent.click(screen.getByRole('button', { name: /just paint it/i }));
    const planCard = await screen.findByTestId('paint-plan-card');
    expect(planCard).toHaveTextContent('Our paint plan');
    expect(screen.getByDisplayValue('a robot chef')).toBeInTheDocument();
    expect(apiCalls.some((c) => c.path === '/llm/image')).toBe(false);
  });
});
