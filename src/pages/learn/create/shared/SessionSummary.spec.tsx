import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SessionSummary } from './SessionSummary';

const summary = { id: 's1', duration_minutes: 5, artifacts_count: 2, stars_used: 3, llm_calls: 4 };

describe('SessionSummary', () => {
  it('renders each stat under its own label and closes on Done', async () => {
    const onClose = vi.fn();
    render(<SessionSummary summary={summary} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: /Nice session/ })).toBeInTheDocument();

    // Assert the number sits in the tile of its label, so a swapped stat is caught.
    const tile = (label: string) => screen.getByText(label).parentElement as HTMLElement;
    expect(within(tile('min')).getByText('5')).toBeInTheDocument();
    expect(within(tile('made')).getByText('2')).toBeInTheDocument();
    expect(within(tile('stars')).getByText('3')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Done/ }));
    expect(onClose).toHaveBeenCalled();
  });
});
