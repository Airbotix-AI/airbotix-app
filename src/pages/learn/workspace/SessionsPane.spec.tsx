import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SessionsPane, type SessionRow } from './SessionsPane';

function row(p: Partial<SessionRow> = {}): SessionRow {
  return {
    id: 's1',
    studio: 'chat',
    started_at: new Date().toISOString(),
    stars_used: 2,
    artifacts_count: 1,
    llm_calls: 1,
    ended_at: null,
    ...p,
  };
}

const noop = () => {};

describe('SessionsPane', () => {
  it('shows a loading line while sessions load', () => {
    render(<SessionsPane sessions={[]} loading activeId={null} onPick={noop} onNew={noop} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the empty hint when there are no sessions', () => {
    render(<SessionsPane sessions={[]} loading={false} activeId={null} onPick={noop} onNew={noop} />);
    expect(screen.getByText(/No sessions yet/)).toBeInTheDocument();
  });

  it('groups today’s sessions and calls onPick when one is clicked', async () => {
    const onPick = vi.fn();
    render(
      <SessionsPane
        sessions={[row({ id: 's1', studio: 'image' })]}
        loading={false}
        activeId={null}
        onPick={onPick}
        onNew={noop}
      />,
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Image/ }));
    expect(onPick).toHaveBeenCalledWith('s1');
  });

  it('the "Make something" button calls onNew', async () => {
    const onNew = vi.fn();
    render(<SessionsPane sessions={[]} loading={false} activeId={null} onPick={noop} onNew={onNew} />);
    await userEvent.click(screen.getByRole('button', { name: /Make something/ }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });
});
