// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api } = vi.hoisted(() => ({ api: vi.fn() }));
vi.mock('@/lib/api', () => ({ api }));

import { KidImagesPage } from './KidImagesPage';
import { GALLERY_FETCH_LIMIT, type KidImageArtifact } from './kidImages';

/** The gallery asks for the backend's maximum page rather than its default 40. */
const IMAGES_PATH = `/kids/kid-1/artifacts?kind=image&limit=${GALLERY_FETCH_LIMIT}`;

const TODAY_ART: KidImageArtifact = {
  id: 'art-1',
  kind: 'image',
  s3_key: 'families/fam-1/art-1.png',
  mime_type: 'image/png',
  size_bytes: 1024,
  created_at: new Date().toISOString(),
  project_id: 'proj-1',
  metadata: { prompt: 'A robot dancing in space', stars_charged: 9 },
};

const OLDER_ART: KidImageArtifact = {
  id: 'art-2',
  kind: 'image',
  s3_key: 'families/fam-1/art-2.png',
  mime_type: 'image/png',
  size_bytes: 2048,
  created_at: '2026-06-30T04:00:00Z',
  project_id: 'proj-1',
  metadata: { prompt: 'Dragon flying over the city, pixel-art style', stars_charged: 9 },
};

function mockApi(artifacts: KidImageArtifact[]) {
  api.mockImplementation((path: string) => {
    if (path === '/kids/kid-1') return Promise.resolve({ id: 'kid-1', nickname: 'Mia' });
    if (path === IMAGES_PATH) return Promise.resolve(artifacts);
    if (path.endsWith('/download-url'))
      return Promise.resolve({ url: 'https://signed.example/img' });
    return Promise.reject(new Error(`unmocked ${path}`));
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/portal/family/kid-1/images']}>
        <Routes>
          <Route path="/portal/family/:kidId/images" element={<KidImagesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockApi([TODAY_ART, OLDER_ART]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('KidImagesPage', () => {
  it('renders the grouped grid with correct header totals', async () => {
    renderPage();

    expect(await screen.findByTestId('portal-image-gallery')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('image-card')).toHaveLength(2));

    // Header: count + total stars summed from metadata.stars_charged (9 + 9).
    expect(screen.getByText(/2 pictures/)).toBeInTheDocument();
    expect(screen.getByText(/18★/)).toBeInTheDocument();
    expect(screen.getByText(/Last created/)).toBeInTheDocument();
    // Under the cap, the header claims plain totals — no "latest N" hedging.
    expect(screen.getByTestId('gallery-summary')).not.toHaveTextContent(/latest/i);

    // The list is fetched with the backend's maximum page size, not its default 40.
    expect(api).toHaveBeenCalledWith(IMAGES_PATH);

    // Date buckets: one picture today, one from earlier.
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Earlier')).toBeInTheDocument();

    // Presigned URLs are requested lazily per card.
    await waitFor(() =>
      expect(
        api.mock.calls.filter(([p]) => String(p).endsWith('/download-url')),
      ).toHaveLength(2),
    );
  });

  it('opens a lightbox with the full prompt, timestamp and star cost on click', async () => {
    renderPage();

    const cards = await screen.findAllByTestId('image-card');
    fireEvent.click(cards[0]);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-testid', 'image-lightbox');
    expect(within(dialog).getByText('A robot dancing in space')).toBeInTheDocument();
    expect(within(dialog).getByText(/9★/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('image-lightbox')).not.toBeInTheDocument();
  });

  it('exports a prompts CSV client-side via a blob download', async () => {
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    renderPage();
    fireEvent.click(await screen.findByTestId('export-prompts'));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob;
    expect(blob).toBeInstanceOf(Blob);
    // jsdom's Blob has no .text() — read it through FileReader instead.
    const csv = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsText(blob);
    });
    expect(csv).toContain('date,prompt,stars');
    expect(csv).toContain('A robot dancing in space');
    // The prompt containing a comma is quoted per RFC 4180.
    expect(csv).toContain('"Dragon flying over the city, pixel-art style"');
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    click.mockRestore();
  });

  it('shows a friendly empty state and no export button when there are no pictures', async () => {
    mockApi([]);
    renderPage();

    expect(await screen.findByText('No pictures yet')).toBeInTheDocument();
    expect(screen.getAllByText(/Art Studio/).length).toBeGreaterThan(0);
    expect(screen.queryAllByTestId('image-card')).toHaveLength(0);
    expect(screen.queryByTestId('export-prompts')).not.toBeInTheDocument();
  });

  it('shows an error state with retry instead of the empty state on query failure', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/kids/kid-1') return Promise.resolve({ id: 'kid-1', nickname: 'Mia' });
      return Promise.reject(new Error('boom'));
    });
    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/couldn’t load Mia’s pictures\.|couldn't load Mia's pictures\./)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    expect(screen.queryByText('No pictures yet')).not.toBeInTheDocument();
  });

  it('says it is showing only the latest N when the backend returned a full page', async () => {
    const full: KidImageArtifact[] = Array.from({ length: GALLERY_FETCH_LIMIT }, (_, i) => ({
      ...TODAY_ART,
      id: `art-${i}`,
      metadata: { prompt: `Picture ${i}`, stars_charged: 9 },
    }));
    mockApi(full);
    renderPage();

    const summary = await screen.findByTestId('gallery-summary');
    // Honest header: the totals below describe this page only, not all time.
    expect(summary).toHaveTextContent(`Showing the latest ${GALLERY_FETCH_LIMIT} pictures`);
    expect(summary).toHaveTextContent(`${GALLERY_FETCH_LIMIT * 9}★ spent on these`);
    // It must NOT claim a bare all-time count/spend.
    expect(summary).not.toHaveTextContent(new RegExp(`^${GALLERY_FETCH_LIMIT} pictures`));
  });

  it('surfaces a notice instead of a fabricated name when the kid lookup fails', async () => {
    api.mockImplementation((path: string) => {
      if (path === '/kids/kid-1') return Promise.reject(new Error('kid boom'));
      if (path === IMAGES_PATH) return Promise.resolve([TODAY_ART]);
      if (path.endsWith('/download-url'))
        return Promise.resolve({ url: 'https://signed.example/img' });
      return Promise.reject(new Error(`unmocked ${path}`));
    });
    renderPage();

    expect(await screen.findByTestId('kid-name-error')).toBeInTheDocument();
    // Never invents a nickname — heading falls back to the surface name.
    expect(screen.getByRole('heading', { name: 'Art Studio pictures' })).toBeInTheDocument();
    expect(screen.queryByText(/Your kid’s pictures|Your kid's pictures/)).not.toBeInTheDocument();
    // The pictures themselves still render.
    await waitFor(() => expect(screen.getAllByTestId('image-card')).toHaveLength(1));
  });
});
