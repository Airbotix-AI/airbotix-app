// @vitest-environment jsdom

// Art Studio canvas-first page (image-studio-prd v0.9 D-IS-17…19): four zones,
// kid-triggered AI ignitions with真实价签 (👻2★ 👀1★ ✨9★), magic uploads the
// kid's OWN canvas as the ref, results arrive as takes that never replace the
// sketch. ArtCanvas is stubbed (jsdom has no canvas 2D) — the stub exposes a
// draw button so tests can put "ink" on the page.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { forwardRef, useImperativeHandle } from 'react';

interface ApiCall {
  path: string;
  opts?: { method?: string; body?: Record<string, unknown> };
}
const apiCalls: ApiCall[] = [];
const putCalls: string[] = [];

vi.mock('./ArtCanvas', () => ({
  ArtCanvas: forwardRef(function StubCanvas(
    props: { ops: unknown[]; onOpsChange(ops: unknown[]): void; ghostUrl: string | null },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      exportPng: () => 'data:image/png;base64,U1RVQg==', // "STUB"
    }));
    return (
      <div data-testid="art-canvas-stub" data-ghost={props.ghostUrl ?? ''}>
        <button
          data-testid="stub-draw"
          onClick={() =>
            props.onOpsChange([
              ...props.ops,
              { kind: 'stroke', tool: 'pencil', color: '#000', size: 14, points: [[1, 1, 0.5]] },
            ])
          }
        >
          draw
        </button>
      </div>
    );
  }),
}));

vi.mock('@/lib/api', () => ({
  api: vi.fn((path: string, opts?: { method?: string; body?: Record<string, unknown> }) => {
    apiCalls.push({ path, opts });
    if (path.endsWith('/create-buckets/resolve')) {
      return Promise.resolve({ project_id: 'proj_bucket', title: 'My Pictures' });
    }
    if (path === '/llm/image-plan') {
      const hasCanvas = !!opts?.body?.canvas_b64;
      return Promise.resolve({
        reply: hasCanvas ? 'I can see it — a cat!' : 'Where does it happen?',
        chips: hasCanvas ? ['Add a sun'] : ['In space'],
        plan: null,
        stars_charged: 1,
        balance_after: 41,
      });
    }
    if (path === '/llm/image') {
      const ghost = (opts?.body?.options as Record<string, unknown>)?.mode === 'ghost';
      return Promise.resolve({
        id: 'gen_1',
        url: 'https://signed/x.png',
        mime_type: 'image/png',
        stars_charged: ghost ? 2 : 9,
        balance_after: 30,
        artifact_id: ghost ? 'art_ghost' : 'art_magic',
      });
    }
    if (path === '/projects/proj_bucket/artifacts/upload-url') {
      return Promise.resolve({
        url: 'https://s3/put-here',
        headers: { 'Content-Type': 'image/png' },
        s3_key: 'families/fam_1/x/image/sketch.png',
      });
    }
    if (path === '/projects/proj_bucket/artifacts' && opts?.method === 'POST') {
      return Promise.resolve({ id: 'art_sketch' });
    }
    if (path === '/projects' && opts?.method === 'POST') {
      return Promise.resolve({ id: 'proj_mission' });
    }
    if (path === '/projects/proj_mission/artifacts/upload-url') {
      return Promise.resolve({
        url: 'https://s3/put-mission',
        headers: { 'Content-Type': 'image/png' },
        s3_key: 'families/fam_1/m/image/sketch.png',
      });
    }
    if (path === '/projects/proj_mission/artifacts' && opts?.method === 'POST') {
      return Promise.resolve({ id: 'art_msketch' });
    }
    if (path === '/projects/proj_mission/submit') {
      return Promise.resolve({ ok: true, stars_awarded: 3 });
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
vi.mock('../shared/useSession', () => ({
  useStudioSession: () => ({ summary: null, endNow: vi.fn(), dismiss: vi.fn() }),
}));

import { ArtStudioPage } from './ArtStudioPage';

function renderPage(state?: Record<string, unknown>) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/learn/create/image', state }]}>
      <QueryClientProvider client={qc}>
        <ArtStudioPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

const MISSION = {
  id: 'm_art_1',
  slug: 'draw-your-robot',
  title: 'Draw your robot',
  description: 'A robot with a happy face!',
  template: { url: 'data:image/png;base64,VFBM', layer: 'underlay' as const },
  draw_along: ['a big circle for the body', 'two small circles for the eyes'],
  checklist: ['a robot', 'a garden', 'a happy feeling'],
};

describe('ArtStudioPage (canvas-first)', () => {
  beforeEach(() => {
    apiCalls.length = 0;
    putCalls.length = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        putCalls.push(String(url));
        return Promise.resolve({ ok: true } as Response);
      }),
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the four zones with priced ignition buttons', async () => {
    renderPage();
    expect(screen.getByTestId('tool-rail')).toBeInTheDocument();
    expect(screen.getByTestId('art-canvas-stub')).toBeInTheDocument();
    expect(screen.getByTestId('ai-rail')).toBeInTheDocument();
    expect(screen.getByTestId('takes-strip')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sketch it for me −2★/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coach, look! −1★/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bring it to life! −9★/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(apiCalls.some((c) => c.path === '/kids/kid_1/create-buckets/resolve')).toBe(true),
    );
  });

  it('👻 ghost: sends mode=ghost with the typed idea + bucket project_id', async () => {
    renderPage();
    await screen.findByTestId('ai-rail');
    fireEvent.change(screen.getByPlaceholderText(/friendly robot/i), {
      target: { value: 'a dinosaur' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Sketch it for me/ }));
    await waitFor(() => {
      const call = apiCalls.find((c) => c.path === '/llm/image');
      expect(call).toBeDefined();
      expect((call!.opts?.body?.options as Record<string, unknown>).mode).toBe('ghost');
      expect(call!.opts?.body?.prompt).toBe('a dinosaur');
      expect(call!.opts?.body?.project_id).toBe('proj_bucket');
    });
    expect(await screen.findByText(/sketched a faint outline/)).toBeInTheDocument();
  });

  it('👀 look: exports the canvas and posts canvas_b64; reply becomes the last look', async () => {
    renderPage();
    await screen.findByTestId('ai-rail');
    fireEvent.click(screen.getByTestId('stub-draw')); // put ink down
    fireEvent.click(screen.getByRole('button', { name: /Coach, look!/ }));
    await waitFor(() => {
      const call = apiCalls.find((c) => c.path === '/llm/image-plan');
      expect(call).toBeDefined();
      expect(call!.opts?.body?.canvas_b64).toBe('U1RVQg==');
    });
    expect(await screen.findByText('I can see it — a cat!')).toBeInTheDocument();
  });

  it('✨ magic with ink: uploads the sketch, generates with ref_artifact_id, adds takes, keeps the sketch take', async () => {
    renderPage();
    await screen.findByTestId('ai-rail');
    fireEvent.click(screen.getByTestId('stub-draw'));
    fireEvent.click(screen.getByRole('button', { name: /Bring it to life!/ }));
    const sheet = await screen.findByTestId('magic-sheet');
    expect(sheet).toHaveTextContent(/tap 👀 first/);
    fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));

    await waitFor(() => {
      // upload chain: sign → PUT bytes → register
      expect(apiCalls.some((c) => c.path === '/projects/proj_bucket/artifacts/upload-url')).toBe(
        true,
      );
      expect(putCalls).toContain('https://s3/put-here');
      const gen = apiCalls.find((c) => c.path === '/llm/image');
      expect(gen).toBeDefined();
      expect(gen!.opts?.body?.ref_artifact_id).toBe('art_sketch');
      expect(gen!.opts?.body?.project_id).toBe('proj_bucket');
    });
    // takes: sketch + magic — the sketch is never replaced (D-IS-19)
    const takes = await screen.findAllByTestId('take-thumb');
    expect(takes.length).toBe(2);
    expect(screen.getByText('✏️ my sketch')).toBeInTheDocument();
    expect(screen.getByText('✨ magic')).toBeInTheDocument();
  });

  it('✨ magic with an EMPTY canvas is the pure-generation on-ramp (no upload, no ref)', async () => {
    renderPage();
    await screen.findByTestId('ai-rail');
    const magicBtn = screen.getByRole('button', { name: /Bring it to life!/ });
    await waitFor(() => expect(magicBtn).toBeEnabled()); // bucket resolved
    fireEvent.click(magicBtn);
    await screen.findByTestId('magic-sheet');
    fireEvent.change(screen.getByPlaceholderText(/mood or extra wish/i), {
      target: { value: 'a rainbow castle' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));

    await waitFor(() => {
      const gen = apiCalls.find((c) => c.path === '/llm/image');
      expect(gen).toBeDefined();
      expect(gen!.opts?.body?.ref_artifact_id).toBeUndefined();
      expect(gen!.opts?.body?.prompt).toBe('a rainbow castle, cartoon style');
    });
    expect(apiCalls.some((c) => c.path === '/projects/proj_bucket/artifacts/upload-url')).toBe(
      false,
    );
  });

  describe('Mission Mode (D-IS-20/22)', () => {
    it('shows the task card and loads the template underlay', async () => {
      renderPage({ mission: MISSION });
      const card = await screen.findByTestId('mission-card');
      expect(card).toHaveTextContent('Draw your robot');
      expect(card).toHaveTextContent('A robot with a happy face!');
    });

    it('magic creates a MISSION project (not the bucket) and saves there', async () => {
      renderPage({ mission: MISSION });
      await screen.findByTestId('ai-rail');
      fireEvent.click(screen.getByTestId('stub-draw'));
      const magicBtn = screen.getByRole('button', { name: /Bring it to life!/ });
      await waitFor(() => expect(magicBtn).toBeEnabled());
      fireEvent.click(magicBtn);
      await screen.findByTestId('magic-sheet');
      fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));

      await waitFor(() => {
        const create = apiCalls.find((c) => c.path === '/projects' && c.opts?.method === 'POST');
        expect(create).toBeDefined();
        expect(create!.opts?.body?.mission_id).toBe('m_art_1');
        const gen = apiCalls.find((c) => c.path === '/llm/image');
        expect(gen!.opts?.body?.project_id).toBe('proj_mission');
        expect(gen!.opts?.body?.ref_artifact_id).toBe('art_msketch');
      });
      expect(
        apiCalls.some((c) => c.path === '/projects/proj_bucket/artifacts/upload-url'),
      ).toBe(false);
    });

    it('draw-along: shows steps, navigates, and each step summons its own 2★ ghost', async () => {
      renderPage({ mission: MISSION });
      const da = await screen.findByTestId('draw-along');
      expect(da).toHaveTextContent('Step 1/2: a big circle for the body');

      const showBtn = screen.getByRole('button', { name: /Show this step −2★/ });
      await waitFor(() => expect(showBtn).toBeEnabled());
      fireEvent.click(showBtn);
      await waitFor(() => {
        const ghost = apiCalls.find((c) => c.path === '/llm/image');
        expect(ghost).toBeDefined();
        expect((ghost!.opts?.body?.options as Record<string, unknown>).mode).toBe('ghost');
        expect(ghost!.opts?.body?.prompt).toBe(
          'a big circle for the body — part of: Draw your robot',
        );
        expect(ghost!.opts?.body?.project_id).toBe('proj_mission');
      });

      fireEvent.click(screen.getByRole('button', { name: '→' }));
      expect(screen.getByTestId('draw-along')).toHaveTextContent(
        'Step 2/2: two small circles for the eyes',
      );
    });

    it('👀 look embeds the mission checklist so the coach ticks elements', async () => {
      renderPage({ mission: MISSION });
      await screen.findByTestId('ai-rail');
      fireEvent.click(screen.getByTestId('stub-draw'));
      fireEvent.click(screen.getByRole('button', { name: /Coach, look!/ }));
      await waitFor(() => {
        const call = apiCalls.find((c) => c.path === '/llm/image-plan');
        const messages = call!.opts?.body?.messages as Array<{ content: string }>;
        expect(messages.at(-1)!.content).toContain('a robot, a garden, a happy feeling');
        expect(call!.opts?.body?.canvas_b64).toBe('U1RVQg==');
      });
    });

    it('📖 story time appears after a magic take and asks for a story + name (1★)', async () => {
      renderPage({ mission: MISSION });
      await screen.findByTestId('ai-rail');
      fireEvent.click(screen.getByTestId('stub-draw'));
      const magicBtn = screen.getByRole('button', { name: /Bring it to life!/ });
      await waitFor(() => expect(magicBtn).toBeEnabled());
      fireEvent.click(magicBtn);
      await screen.findByTestId('magic-sheet');
      fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));

      const storyBtn = await screen.findByRole('button', { name: /Story time! −1★/ });
      fireEvent.click(storyBtn);
      await waitFor(() => {
        const call = apiCalls.filter((c) => c.path === '/llm/image-plan').at(-1)!;
        const messages = call.opts?.body?.messages as Array<{ content: string }>;
        expect(messages.at(-1)!.content).toMatch(/story about this picture.*name/);
        expect(call.opts?.body?.canvas_b64).toBe('U1RVQg==');
      });
    });

    it('🚀 turn-in submits the mission project and celebrates +3★', async () => {
      renderPage({ mission: MISSION });
      await screen.findByTestId('ai-rail');
      fireEvent.click(screen.getByTestId('stub-draw'));
      const magicBtn = screen.getByRole('button', { name: /Bring it to life!/ });
      await waitFor(() => expect(magicBtn).toBeEnabled());
      fireEvent.click(magicBtn);
      await screen.findByTestId('magic-sheet');
      fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));
      const turnIn = await screen.findByRole('button', { name: /Turn it in! \+3★/ });
      fireEvent.click(turnIn);

      await waitFor(() => {
        expect(apiCalls.some((c) => c.path === '/projects/proj_mission/submit')).toBe(true);
      });
      expect(await screen.findByText(/Mission complete! \+3★/)).toBeInTheDocument();
    });
  });
});
