// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { WorkingCard } from './WorkingCard';
import { formatSecs } from './turnProgress';
import type { TurnProgress } from './turnProgress';

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

  it('renders the working card with the heading, a clock, and one row per step', () => {
    render(<WorkingCard progress={progress()} />);
    expect(screen.getByTestId('working-card')).toBeTruthy();
    expect(screen.getByText('Working on it…')).toBeTruthy();
    expect(screen.getByTestId('working-clock')).toBeTruthy();
    expect(screen.getAllByTestId('working-step')).toHaveLength(3);
  });

  it('shows the honest step labels (real steps, not fake cycling copy)', () => {
    render(<WorkingCard progress={progress()} />);
    expect(screen.getByText('Looked at your game 👀')).toBeTruthy();
    expect(screen.getByText('Adding Aliens ✍️')).toBeTruthy();
    expect(screen.getByText('Fixing a little glitch 🔧')).toBeTruthy();
  });
});
