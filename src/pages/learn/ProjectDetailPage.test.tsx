// @vitest-environment jsdom

// ProjectDetailPage — first spec for this page. Focus: the "🎨 Keep drawing"
// reopen entry (image-studio-prd D-IS-24 flow): it must exist for IMAGE
// artifacts only and hand the Art Studio the exact
// { editArtifactId, editProjectId } router state the studio's reopen path
// consumes (ArtStudioPage.test.tsx covers the receiving side).

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  BASE_URL: 'http://api.test',
  api: vi.fn((path: string) => {
    if (path === '/projects/proj_1') {
      return Promise.resolve({
        id: 'proj_1',
        title: 'My Pictures',
        kind: 'creative',
        product_line: 'line_a_creative',
        visibility: 'private',
        class_id: null,
        thumbnail_s3_key: null,
        star_cost_total: 9,
        status: 'in_progress',
        created_at: '2026-07-21T00:00:00Z',
        updated_at: '2026-07-21T00:00:00Z',
        mission_id: null,
      });
    }
    if (path === '/projects/proj_1/artifacts') {
      return Promise.resolve([
        {
          id: 'art_img',
          kind: 'image',
          s3_key: 'families/fam_1/x.png',
          mime_type: 'image/png',
          size_bytes: 10,
          created_at: '2026-07-21T00:00:00Z',
          metadata: { prompt: 'a horse' },
        },
        {
          id: 'art_aud',
          kind: 'audio',
          s3_key: 'families/fam_1/y.mp3',
          mime_type: 'audio/mpeg',
          size_bytes: 10,
          created_at: '2026-07-21T00:00:00Z',
          metadata: {},
        },
      ]);
    }
    if (path.endsWith('/download-url')) {
      return Promise.resolve({ url: 'https://signed', expires_in: 300, mime_type: 'image/png', kind: 'image' });
    }
    if (path.includes('/wallet')) {
      return Promise.resolve({ stars_balance: 42, daily_used: 0, daily_cap: 100 });
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
vi.mock('@/lib/ws', () => ({ onWsEvent: () => () => undefined }));
vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: () => undefined }));
// Heavy conditional surfaces — never opened by these specs.
vi.mock('@/pages/learn/classroom/ShareToClassModal', () => ({ ShareToClassModal: () => null }));
vi.mock('@/pages/learn/create/shared/StudioDrawer', () => ({ StudioDrawer: () => null }));
vi.mock('@/pages/learn/create/shared/ImageStudioContent', () => ({ ImageStudioContent: () => null }));
vi.mock('@/pages/learn/create/shared/VoiceStudioContent', () => ({ VoiceStudioContent: () => null }));
vi.mock('@/pages/learn/create/shared/VideoStudioContent', () => ({ VideoStudioContent: () => null }));
vi.mock('@/pages/learn/create/shared/StoryStudioContent', () => ({ StoryStudioContent: () => null }));
vi.mock('@/pages/learn/create/shared/MusicStudioContent', () => ({ MusicStudioContent: () => null }));

import { ProjectDetailPage } from './ProjectDetailPage';

/** Lands where "Keep drawing" navigates and prints the router state it got. */
function ArtStudioProbe() {
  const location = useLocation();
  return <div data-testid="art-studio-probe">{JSON.stringify(location.state)}</div>;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter initialEntries={['/learn/projects/proj_1']}>
      <QueryClientProvider client={qc}>
        <Routes>
          <Route path="/learn/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/learn/create/image" element={<ArtStudioProbe />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('ProjectDetailPage — 🎨 Keep drawing reopen entry', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('an image artifact offers Keep drawing and hands the Art Studio the reopen state', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'My Pictures' });

    // Sections render image first — its card owns the first ⋯ menu.
    const menus = await screen.findAllByTitle('Options');
    fireEvent.click(menus[0]);
    const keepDrawing = await screen.findByRole('button', { name: /Keep drawing/ });
    fireEvent.click(keepDrawing);

    // The studio route received EXACTLY the state its reopen path consumes.
    const probe = await screen.findByTestId('art-studio-probe');
    expect(JSON.parse(probe.textContent as string)).toEqual({
      editArtifactId: 'art_img',
      editProjectId: 'proj_1',
    });
  });

  it('non-image artifacts do NOT offer Keep drawing', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'My Pictures' });

    const menus = await screen.findAllByTitle('Options');
    fireEvent.click(menus[1]); // the audio card's menu
    // The menu is open (Rename is there) but Keep drawing is image-only.
    await screen.findByRole('button', { name: /Rename/ });
    expect(screen.queryByRole('button', { name: /Keep drawing/ })).not.toBeInTheDocument();
  });
});
