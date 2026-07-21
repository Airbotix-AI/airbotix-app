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
    props: {
      ops: unknown[];
      onOpsChange(ops: unknown[]): void;
      ghostUrl: string | null;
      baseImageUrl: string | null;
      maskOps: unknown[];
      onMaskOpsChange(ops: unknown[]): void;
    },
    ref,
  ) {
    useImperativeHandle(ref, () => ({
      exportPng: () => 'data:image/png;base64,U1RVQg==', // "STUB"
    }));
    return (
      <div
        data-testid="art-canvas-stub"
        data-ghost={props.ghostUrl ?? ''}
        data-ops={props.ops.length}
        data-base={props.baseImageUrl ?? ''}
      >
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
        <button
          data-testid="stub-mask-draw"
          onClick={() =>
            props.onMaskOpsChange([
              ...props.maskOps,
              { kind: 'stroke', tool: 'marker', color: '#f277c3', size: 20, points: [[2, 2, 0.5]] },
            ])
          }
        >
          mask
        </button>
      </div>
    );
  }),
}));

vi.mock('@/lib/api', () => ({
  BASE_URL: 'http://api.test',
  api: vi.fn((path: string, opts?: { method?: string; body?: Record<string, unknown> }) => {
    apiCalls.push({ path, opts });
    if (path.endsWith('/create-buckets/resolve')) {
      return Promise.resolve({ project_id: 'proj_bucket', title: 'My Pictures' });
    }
    if (path === '/llm/image-plan') {
      const hasCanvas = !!opts?.body?.canvas_b64;
      // The coach reaches a plan when the kid states a subject swap (D-ISF-3
      // tests use "cow"); otherwise it keeps asking.
      const msgs = (opts?.body?.messages as Array<{ content: string }> | undefined) ?? [];
      const wantsPlan = msgs.at(-1)?.content.includes('cow') ?? false;
      return Promise.resolve({
        reply: hasCanvas ? 'I can see it — a cat!' : 'Where does it happen?',
        chips: hasCanvas ? ['Add a sun'] : ['In space'],
        plan: wantsPlan
          ? { prompt: 'A friendly cow in a sunny meadow', style: 'watercolor', size: 'square' }
          : null,
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
    if (path.startsWith('/projects/proj_bucket/artifacts/') && opts?.method === 'PATCH') {
      return Promise.resolve({ id: 'art_magic', metadata: { character: 'Sparky' } });
    }
    if (path === '/kids/kid_1/projects') {
      return Promise.resolve([
        { id: 'g1', title: 'Space Pong', kind: 'game' },
        { id: 'p2', title: 'My Pictures', kind: 'creative' },
      ]);
    }
    if (path === '/projects/g1/vfs/assets/sign-upload') {
      return Promise.resolve({ url: 'https://s3/put-game', headers: { 'Content-Type': 'image/png' }, s3_key: 'vfs/x' });
    }
    if (path === '/projects/g1' && (!opts || opts.method === undefined)) {
      return Promise.resolve({ id: 'g1', vfs_version: 7 });
    }
    if (path === '/projects/g1/code/files') {
      return Promise.resolve({ ok: true });
    }
    if (path === '/projects/proj_bucket/artifacts')
      return Promise.resolve([
        { id: 'art_magic', project_id: 'proj_bucket', kind: 'image', metadata: {} },
        { id: 'art_sketch', project_id: 'proj_bucket', kind: 'image', metadata: {} },
      ]);
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
vi.mock('@/auth/authStore', () => ({
  surfacePrincipal: () => 'kid',
  useAuthStore: { getState: () => ({ tokens: { kid: 'tok', user: null } }) },
}));
vi.mock('../shared/useSession', () => ({
  useStudioSession: () => ({ summary: null, endNow: vi.fn(), dismiss: vi.fn() }),
}));

vi.mock('./strokeEngine', async (importOriginal) => {
  const real = (await importOriginal()) as Record<string, unknown>;
  return { ...real, exportMask: () => 'data:image/png;base64,TUFTSw==' }; // "MASK"
});

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
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init?: RequestInit) => {
        putCalls.push(`${init?.method ?? 'GET'} ${url}`);
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob([new Uint8Array([1])], { type: 'image/png' })),
        } as unknown as Response);
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
    // brand mark rides the bottom bar like the Music Stage (immersive page has no nav)
    expect(screen.getByTestId('studio-brand')).toBeInTheDocument();
    expect(screen.getByAltText('Airbotix')).toHaveAttribute('src', '/logo-black-horizontal.png');
    expect(screen.getByRole('button', { name: /Sketch it for me −2★/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Coach, look! −1★/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bring it to life! −9★/ })).toBeInTheDocument();
    await waitFor(() =>
      expect(apiCalls.some((c) => c.path === '/kids/kid_1/create-buckets/resolve')).toBe(true),
    );
  });

  // Two-column rail (owner feedback 2026-07-20): column 2 shows only the picked
  // tool's options — sticker grid for the stamp tool, colours for painting
  // tools, size preview-dots always at the top (except the colour-only fill).
  it('tool options live in a second column scoped to the picked tool', () => {
    renderPage();
    // default pencil: colours + size dots, no sticker grid
    expect(screen.getByTestId('tool-options')).toBeInTheDocument();
    expect(screen.getByLabelText('color #1f2437')).toBeInTheDocument();
    expect(screen.getByLabelText('size S')).toBeInTheDocument();
    expect(screen.queryByTestId('stamp-grid')).toBeNull();
    // stamp tool: sticker grid appears, colours leave, sizes stay (stamps scale)
    fireEvent.click(screen.getByLabelText('Stamp'));
    expect(screen.getByTestId('stamp-grid')).toBeInTheDocument();
    expect(screen.getByLabelText('sticker ❤️')).toBeInTheDocument();
    // expanded sticker set (owner feedback 2026-07-21: 6 was too few) — 24 stamps
    expect(screen.getByLabelText('sticker 🦄')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/^sticker /).length).toBe(24);
    expect(screen.queryByLabelText('color #1f2437')).toBeNull();
    expect(screen.getByLabelText('size L')).toBeInTheDocument();
    // fill tool: colours only — a bucket has no width
    fireEvent.click(screen.getByLabelText('Fill'));
    expect(screen.queryByLabelText('size S')).toBeNull();
    expect(screen.getByLabelText('color #1f2437')).toBeInTheDocument();
  });

  // Draft auto-save (owner: "我刷新的话，反正画都没了") — the working canvas
  // persists to localStorage so a refresh/leave no longer loses an unsaved drawing.
  describe('draft auto-save + reopen', () => {
    const KEY = 'art-draft:v1:proj_bucket';

    const stroke = { kind: 'stroke', tool: 'pencil', color: '#000', size: 14, points: [[1, 1, 0.5]] };

    it('auto-saves { ops, base } to localStorage as the kid draws', async () => {
      renderPage();
      await screen.findByTestId('ai-rail');
      expect(localStorage.getItem(KEY)).toBeNull();
      fireEvent.click(screen.getByTestId('stub-draw'));
      await waitFor(() => expect(localStorage.getItem(KEY)).not.toBeNull());
      const saved = JSON.parse(localStorage.getItem(KEY) as string);
      expect(saved.ops).toHaveLength(1);
    });

    it('restores the saved draft on the next mount (survives refresh)', async () => {
      localStorage.setItem(KEY, JSON.stringify({ ops: [stroke], baseArtifactId: null, baseRef: null }));
      renderPage();
      await screen.findByTestId('ai-rail');
      // the restored stroke reaches the canvas (data-ops reflects props.ops.length)
      await waitFor(() =>
        expect(screen.getByTestId('art-canvas-stub').getAttribute('data-ops')).toBe('1'),
      );
    });

    it('clears the draft key once the canvas is emptied', async () => {
      renderPage();
      await screen.findByTestId('ai-rail');
      fireEvent.click(screen.getByTestId('stub-draw'));
      await waitFor(() => expect(localStorage.getItem(KEY)).not.toBeNull());
      // "+ new picture" resets the canvas → the draft key is removed.
      fireEvent.click(screen.getByRole('button', { name: /new picture/ }));
      await waitFor(() => expect(localStorage.getItem(KEY)).toBeNull());
    });

    it('a fresh reopen starts clean on the picture and auto-saves it (base persisted)', async () => {
      // A stale free-play draft must NOT bleed onto the freshly opened picture…
      localStorage.setItem(KEY, JSON.stringify({ ops: [stroke], baseArtifactId: null, baseRef: null }));
      renderPage({ editArtifactId: 'art_reopen_1', editProjectId: 'proj_saved_pics' });
      await screen.findByTestId('ai-rail');
      expect(screen.getByTestId('art-canvas-stub').getAttribute('data-ops')).toBe('0');
      // the reopened picture is the canvas base (its magic-brush control shows)…
      expect(screen.getByTestId('mask-toggle')).toBeInTheDocument();
      // …and auto-save now records that base (so a refresh restores it too).
      await waitFor(() => {
        const saved = JSON.parse(localStorage.getItem(KEY) as string);
        expect(saved.baseRef).toEqual({ id: 'art_reopen_1', projectId: 'proj_saved_pics' });
      });
    });

    it('a REFRESH after reopening restores the base picture (no nav state)', async () => {
      // What a fresh reopen persisted (base, no strokes yet). A plain reload has no
      // nav state, so the base must come back from the draft alone.
      localStorage.setItem(
        KEY,
        JSON.stringify({
          ops: [],
          baseArtifactId: 'art_reopen_1',
          baseRef: { id: 'art_reopen_1', projectId: 'proj_saved_pics' },
        }),
      );
      renderPage();
      await screen.findByTestId('ai-rail');
      // base restored → the magic-brush control (gated on a base) is present again
      await waitFor(() => expect(screen.getByTestId('mask-toggle')).toBeInTheDocument());
    });
  });

  // "+ new picture" keeps the old artwork (owner: 原先的也保留): an unsaved
  // drawing is snapshotted into My Pictures before the canvas resets.
  it('＋ new picture saves the unsaved drawing to the bucket before resetting', async () => {
    renderPage();
    await screen.findByTestId('ai-rail');
    fireEvent.click(screen.getByTestId('stub-draw'));
    fireEvent.click(screen.getByRole('button', { name: /new picture/ }));
    await waitFor(() =>
      expect(apiCalls.some((c) => c.path === '/projects/proj_bucket/artifacts/upload-url')).toBe(
        true,
      ),
    );
    await waitFor(() =>
      expect(
        apiCalls.some(
          (c) =>
            c.path === '/projects/proj_bucket/artifacts' &&
            (c.opts?.body as { metadata?: { source?: string } })?.metadata?.source ===
              'canvas-sketch',
        ),
      ).toBe(true),
    );
    // strip reset for the fresh canvas
    await waitFor(() => expect(screen.queryAllByTestId('take-thumb')).toHaveLength(0));
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
      expect(putCalls).toContain('PUT https://s3/put-here');
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

  describe('🪄 magic brush (D-IS-18 ④)', () => {
    async function makeAMagicTake() {
      renderPage();
      await screen.findByTestId('ai-rail');
      fireEvent.click(screen.getByTestId('stub-draw'));
      const magicBtn = screen.getByRole('button', { name: /Bring it to life!/ });
      await waitFor(() => expect(magicBtn).toBeEnabled());
      fireEvent.click(magicBtn);
      await screen.findByTestId('magic-sheet');
      fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));
      await screen.findAllByTestId('take-thumb');
    }

    it('is hidden on an EMPTY canvas, appears as soon as there is ink (D-ISF-4)', async () => {
      renderPage();
      await screen.findByTestId('ai-rail');
      expect(screen.queryByTestId('mask-toggle')).not.toBeInTheDocument();
      fireEvent.click(screen.getByTestId('stub-draw'));
      expect(await screen.findByTestId('mask-toggle')).toBeInTheDocument();
      fireEvent.click(screen.getByTestId('mask-toggle'));
      expect(screen.getByTestId('mask-bar')).toBeInTheDocument();
    });

    it('paint region + wish → /llm/image with ref_artifact_id AND mask_b64 (9★), then clears', async () => {
      await makeAMagicTake();
      fireEvent.click(await screen.findByTestId('mask-toggle'));
      fireEvent.click(screen.getByTestId('stub-mask-draw'));
      fireEvent.change(screen.getByPlaceholderText(/what it becomes/i), {
        target: { value: 'a golden crown' },
      });
      fireEvent.click(screen.getByRole('button', { name: /🪄 −9★/ }));

      await waitFor(() => {
        const call = apiCalls.filter((c) => c.path === '/llm/image').at(-1)!;
        expect(call.opts?.body?.ref_artifact_id).toBe('art_magic');
        expect(call.opts?.body?.mask_b64).toBe('TUFTSw==');
        // D-ISF-5: the wish rides inside the region-replace template
        expect(call.opts?.body?.prompt).toBe(
          'Same picture, keep everything outside the highlighted region unchanged; the highlighted region becomes: a golden crown',
        );
      });
      // a new take arrived and the mask UI reset
      expect((await screen.findAllByTestId('take-thumb')).length).toBe(3);
      await waitFor(() => expect(screen.queryByTestId('mask-bar')).not.toBeInTheDocument());
    });

    // The reported horse→cow case: region-replace ON A RAW SKETCH (no AI take
    // yet). The canvas is snapshotted as the reference first (D-ISF-4).
    it('raw sketch: apply uploads the canvas as the ref, then edits with the mask', async () => {
      renderPage();
      await screen.findByTestId('ai-rail');
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /Bring it to life!/ })).toBeEnabled(),
      );
      fireEvent.click(screen.getByTestId('stub-draw'));
      fireEvent.click(await screen.findByTestId('mask-toggle'));
      fireEvent.click(screen.getByTestId('stub-mask-draw'));
      fireEvent.change(screen.getByPlaceholderText(/what it becomes/i), {
        target: { value: 'a cow' },
      });
      fireEvent.click(screen.getByRole('button', { name: /🪄 −9★/ }));

      await waitFor(() => {
        // upload chain ran (sign → PUT → register) to mint the sketch ref
        expect(apiCalls.some((c) => c.path === '/projects/proj_bucket/artifacts/upload-url')).toBe(
          true,
        );
        const call = apiCalls.filter((c) => c.path === '/llm/image').at(-1)!;
        expect(call.opts?.body?.ref_artifact_id).toBe('art_sketch');
        expect(call.opts?.body?.mask_b64).toBe('TUFTSw==');
        expect(call.opts?.body?.prompt).toBe(
          'Same picture, keep everything outside the highlighted region unchanged; the highlighted region becomes: a cow',
        );
      });
      // sketch + magic takes, and the sketch strokes left the canvas (they'd
      // otherwise re-draw the horse over the cow result)
      expect((await screen.findAllByTestId('take-thumb')).length).toBe(2);
      expect(screen.getByText('✏️ my sketch')).toBeInTheDocument();
      await waitFor(() =>
        expect(screen.getByTestId('art-canvas-stub').getAttribute('data-ops')).toBe('0'),
      );
    });
  });

  describe('coach plan feeds ✨ (D-ISF-3)', () => {
    async function planFromCoach() {
      renderPage();
      await screen.findByTestId('ai-rail');
      fireEvent.change(screen.getByPlaceholderText(/friendly robot/i), {
        target: { value: 'turn my horse into a cow' },
      });
      fireEvent.click(screen.getByRole('button', { name: /^Send/ }));
      await screen.findByText('Where does it happen?'); // coach turn landed (with a plan)
      const magicBtn = screen.getByRole('button', { name: /Bring it to life!/ });
      await waitFor(() => expect(magicBtn).toBeEnabled());
      fireEvent.click(magicBtn);
      await screen.findByTestId('magic-sheet');
    }

    it('with no typed wish, the plan IS the prompt (and its style pre-selects)', async () => {
      await planFromCoach();
      expect(screen.getByTestId('magic-plan')).toHaveTextContent('A friendly cow in a sunny meadow');
      fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));
      await waitFor(() => {
        const gen = apiCalls.find((c) => c.path === '/llm/image');
        expect(gen).toBeDefined();
        expect(gen!.opts?.body?.prompt).toBe('A friendly cow in a sunny meadow, watercolor style');
      });
    });

    it('a typed wish still beats the plan', async () => {
      await planFromCoach();
      fireEvent.change(screen.getByPlaceholderText(/mood or extra wish/i), {
        target: { value: 'a purple dragon' },
      });
      fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));
      await waitFor(() => {
        const gen = apiCalls.find((c) => c.path === '/llm/image');
        expect(gen).toBeDefined();
        expect(gen!.opts?.body?.prompt).toBe('a purple dragon, watercolor style');
      });
    });
  });

  describe('👤 My Characters + 🎮 use in my game (D-IS-23/25)', () => {
    async function makeAMagicTake() {
      renderPage();
      await screen.findByTestId('ai-rail');
      fireEvent.click(screen.getByTestId('stub-draw'));
      const magicBtn = screen.getByRole('button', { name: /Bring it to life!/ });
      await waitFor(() => expect(magicBtn).toBeEnabled());
      fireEvent.click(magicBtn);
      await screen.findByTestId('magic-sheet');
      fireEvent.click(screen.getByRole('button', { name: /Make it! −9★/ }));
      await screen.findAllByTestId('take-thumb');
    }

    it('names the active take → PATCH artifact metadata.character', async () => {
      await makeAMagicTake();
      const nameInput = await screen.findByPlaceholderText(/Name them/);
      fireEvent.change(nameInput, { target: { value: 'Sparky' } });
      fireEvent.click(screen.getByRole('button', { name: /👤 Save/ }));
      await waitFor(() => {
        const patch = apiCalls.find(
          (c) => c.opts?.method === 'PATCH' && c.path.includes('/artifacts/'),
        );
        expect(patch).toBeDefined();
        expect((patch!.opts?.body?.metadata as Record<string, unknown>).character).toBe('Sparky');
      });
      expect(await screen.findByText(/Sparky joined your characters/)).toBeInTheDocument();
    });

    it('🎮 sends the active take into a chosen game via the VFS asset flow', async () => {
      await makeAMagicTake();
      fireEvent.click(await screen.findByTestId('use-in-game'));
      await screen.findByTestId('game-sheet');
      // only game/code projects offered — the creative bucket is filtered out
      expect(screen.queryByText('My Pictures', { selector: 'button' })).not.toBeInTheDocument();
      fireEvent.click(await screen.findByRole('button', { name: /Space Pong/ }));

      expect(await screen.findByText(/Sent to .Space Pong/)).toBeInTheDocument();
      expect(apiCalls.some((c) => c.path === '/projects/g1/vfs/assets/sign-upload')).toBe(true);
      expect(putCalls.some((u) => u === 'PUT https://s3/put-game')).toBe(true);
      const save = apiCalls.find((c) => c.path === '/projects/g1/code/files');
      expect(save).toBeDefined();
      const files = save!.opts?.body?.files as Array<{ path: string; uploaded: boolean }>;
      expect(files[0].uploaded).toBe(true);
      expect(files[0].path).toMatch(/^assets\/art\//);
      expect(save!.opts?.body?.expected_version).toBe(7);
    });
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
