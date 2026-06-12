// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkingCard } from './WorkingCard';
import { formatSecs, type TurnProgress } from './turnProgress';

afterEach(cleanup);

describe('formatSecs', () => {
  it('shows seconds under a minute and m:ss beyond', () => {
    expect(formatSecs(4)).toBe('4s');
    expect(formatSecs(59)).toBe('59s');
    expect(formatSecs(67)).toBe('1:07');
    expect(formatSecs(125)).toBe('2:05');
  });
});

describe('WorkingCard', () => {
  const progress = (): TurnProgress => {
    const now = Date.now();
    return {
      startedAt: now - 5000,
      steps: [
        { id: 's1', key: '@looking', label: 'Looked at your game 👀', status: 'done', startedAt: now - 5000, endedAt: now - 3000 },
        { id: 's2', key: 'Aliens.js', label: 'Adding Aliens ✍️', status: 'active', startedAt: now - 3000 },
        { id: 's3', key: '@fix', label: 'Fixing a little glitch 🔧', status: 'fixing', startedAt: now - 1000 },
      ],
    };
  };

  it('renders the ring, a clock, and ONLY the current state (no heading, no history)', () => {
    render(<WorkingCard progress={progress()} />);
    expect(screen.getByTestId('working-card')).toBeTruthy();
    expect(screen.getByTestId('working-ring')).toBeTruthy();
    expect(screen.getByTestId('working-clock')).toBeTruthy();
    expect(screen.getAllByTestId('working-current')).toHaveLength(1);
    // The current-state line IS the title — no redundant heading, no live badge.
    expect(screen.queryByText('Working on it…')).toBeNull();
    expect(screen.queryByText('live')).toBeNull();
    // The latest step is the current state; finished/earlier steps are not shown.
    expect(screen.getByText('Fixing a little glitch 🔧')).toBeTruthy();
    expect(screen.queryByText('Looked at your game 👀')).toBeNull();
    expect(screen.queryByText('Adding Aliens ✍️')).toBeNull();
  });

  it('shows a rotating filler while still on the opening step (no real delta yet)', () => {
    const now = Date.now();
    render(
      <WorkingCard
        progress={{
          startedAt: now - 5000,
          steps: [{ id: 's1', key: '@looking', label: 'Looking at your game 👀', status: 'active', startedAt: now - 5000 }],
        }}
      />,
    );
    // ~5s elapsed → second filler in the rotation.
    expect(screen.getByText('Thinking it through 🤔')).toBeTruthy();
  });

  it('the ring is the single indeterminate indicator (spin + arc-breathe, no % anywhere)', () => {
    const { container } = render(<WorkingCard progress={progress()} />);
    const ring = screen.getByTestId('working-ring');
    expect(ring.getAttribute('class')).toContain('pg-orb-spin');
    expect(container.querySelector('.pg-ring-arc')).toBeTruthy();
    // No second indicator: no progress-bar element with an inline width.
    expect(container.querySelector('[style*="width"]')).toBeNull();
  });
});
