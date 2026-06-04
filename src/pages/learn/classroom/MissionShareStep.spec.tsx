import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MissionShareStep } from './MissionShareStep';

vi.mock('./ShareToClassModal', () => ({
  ShareToClassModal: ({ onShared }: { onShared?: () => void }) => (
    <button onClick={onShared}>DO SHARE</button>
  ),
}));

describe('MissionShareStep', () => {
  it('opens the share modal and marks the step done once shared', async () => {
    const onComplete = vi.fn();
    render(<MissionShareStep projectId="p1" onComplete={onComplete} />);

    expect(screen.getByText('Share your work with the class')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Share with class/ }));

    // modal stub is now mounted — completing the share marks the step done
    await userEvent.click(screen.getByRole('button', { name: 'DO SHARE' }));

    expect(screen.getByText(/Sent! This step is done/)).toBeInTheDocument();
    expect(onComplete).toHaveBeenCalled();
  });
});
