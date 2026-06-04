import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SessionSummary } from './SessionSummary';

const summary = { id: 's1', duration_minutes: 5, artifacts_count: 2, stars_used: 3, llm_calls: 4 };

describe('SessionSummary', () => {
  it('renders the session stats and closes on Done', async () => {
    const onClose = vi.fn();
    render(<SessionSummary summary={summary} onClose={onClose} />);

    expect(screen.getByRole('heading', { name: /Nice session/ })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // minutes
    expect(screen.getByText('2')).toBeInTheDocument(); // artifacts
    expect(screen.getByText('3')).toBeInTheDocument(); // stars

    await userEvent.click(screen.getByRole('button', { name: /Done/ }));
    expect(onClose).toHaveBeenCalled();
  });
});
