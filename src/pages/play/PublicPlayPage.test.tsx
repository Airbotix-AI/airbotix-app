// @vitest-environment jsdom
// Public play page (/play/:shareId) — the brand frame + surface routing.
// Covers: the PlayBrandBar (logo → marketing, first-party "Make your own" →
// /try, both new-tab) renders above the GAME canvas and the BLOCKS player; the
// blocks player defaults to the DARK theme; the 410 gone state stays a flat,
// frame-less dead end. FE-only — readPublicSnapshot is mocked (no network).

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { blankProject, BLOCKS_PROJECT_FILE } from '../learn/blocks/blocksModel';
import type { VfsFile } from '../learn/code/codeApi';

// Keep the real ShareGoneError (used in `instanceof`); stub only the fetch.
// `vi.hoisted` so the spy exists when the hoisted `vi.mock` factory runs.
const { readPublicSnapshot } = vi.hoisted(() => ({ readPublicSnapshot: vi.fn() }));
vi.mock('../learn/playground/sharingApi', async (orig) => {
  const actual = await orig<typeof import('../learn/playground/sharingApi')>();
  return { ...actual, readPublicSnapshot };
});

import { ShareGoneError } from '../learn/playground/sharingApi';
import { PublicPlayPage } from './PublicPlayPage';

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

function renderPlay() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/play/abc123']}>
        <Routes>
          <Route path="/play/:shareId" element={<PublicPlayPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PublicPlayPage brand frame', () => {
  beforeEach(() => {
    readPublicSnapshot.mockReset();
  });

  it('shows the brand frame above a GAME canvas — logo + first-party CTA, both new-tab', async () => {
    readPublicSnapshot.mockResolvedValue([text('main.js', 'new Phaser.Game({});')]);
    renderPlay();

    expect(await screen.findByTestId('play-iframe')).toBeInTheDocument();
    const bar = screen.getByTestId('play-brand-bar');
    expect(bar).toBeInTheDocument();

    // Brand attribution → marketing home, opens a new tab (session never lost).
    const home = within(bar).getByTestId('play-brand-home');
    expect(home).toHaveAttribute('target', '_blank');
    expect(home).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(home.getAttribute('href')).toMatch(/^https?:\/\//);
    expect(within(home).getByAltText('AirBotix')).toBeInTheDocument();

    // First-party "Make your own" → the marketing /programs page, new tab.
    const cta = within(bar).getByTestId('play-make-own');
    expect(cta).toHaveTextContent('Make your own');
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta.getAttribute('href')).toMatch(/\/programs$/);
  });

  it('shows the brand frame above the BLOCKS player, defaulted to the dark theme', async () => {
    readPublicSnapshot.mockResolvedValue([
      text(BLOCKS_PROJECT_FILE, JSON.stringify(blankProject('Shared project'))),
    ]);
    renderPlay();

    const blocks = await screen.findByTestId('blocks-play-root');
    expect(blocks).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByTestId('play-brand-bar')).toBeInTheDocument();
    expect(screen.getByTestId('play-make-own')).toBeInTheDocument();
  });

  it('keeps the 410 gone state a flat, frame-less dead end', async () => {
    readPublicSnapshot.mockRejectedValue(new ShareGoneError());
    renderPlay();

    expect(await screen.findByTestId('play-revoked')).toBeInTheDocument();
    expect(screen.queryByTestId('play-brand-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('play-make-own')).not.toBeInTheDocument();
  });
});
