// @vitest-environment jsdom

// Create tab gating (learn PRD v0.7): Image Maker / Voice Booth / Video Studio
// are paused — rendered as non-clickable "Coming soon" cards BELOW the live
// tools, never as links. Live tools stay full pack-card links.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./shared/useStudio', () => ({
  useKidWallet: () => ({ data: { stars_balance: 42 } }),
}));

import { CreateHubPage } from './CreateHubPage';
import { CREATE_TOOLS } from './createTools';

function renderHub() {
  return render(
    <MemoryRouter>
      <CreateHubPage />
    </MemoryRouter>,
  );
}

describe('CreateHubPage coming-soon gating', () => {
  afterEach(cleanup);
  it('marks exactly Image Maker, Voice Booth and Video Studio as coming soon in the registry', () => {
    const paused = CREATE_TOOLS.filter((t) => t.comingSoon).map((t) => t.title);
    expect(paused.sort()).toEqual(['Image Maker', 'Video Studio', 'Voice Booth']);
  });

  it('renders live tools as links and paused tools as non-clickable coming-soon cards', () => {
    renderHub();

    for (const tool of CREATE_TOOLS.filter((t) => !t.comingSoon)) {
      expect(screen.getByRole('link', { name: new RegExp(tool.title) })).toHaveAttribute(
        'href',
        tool.to,
      );
    }

    const section = screen.getByTestId('coming-soon-studios');
    for (const tool of CREATE_TOOLS.filter((t) => t.comingSoon)) {
      // no link anywhere on the page for a paused tool…
      expect(screen.queryByRole('link', { name: new RegExp(tool.title) })).toBeNull();
      // …but its teaser card sits inside the coming-soon section
      expect(within(section).getByText(tool.title)).toBeInTheDocument();
    }
    // one "Coming soon" sticker per paused tool (the section eyebrow says it too)
    expect(section.querySelectorAll('.sticker-sunshine').length).toBe(3);
  });

  it('places the coming-soon section after the live tool grid', () => {
    renderHub();
    const liveCard = screen.getByRole('link', { name: /Story Blocks/ });
    const section = screen.getByTestId('coming-soon-studios');
    // DOM order: the live grid precedes the coming-soon section
    expect(
      liveCard.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
