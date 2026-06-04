import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StudioPicker } from './StudioPicker';
import { STUDIOS } from './studios';

describe('StudioPicker', () => {
  it('renders the prompt and one card per studio', () => {
    render(<StudioPicker onPick={() => {}} busy={false} />);
    expect(screen.getByRole('heading', { name: /What do you want to make/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(STUDIOS.length);
  });

  it('calls onPick with the studio id when a card is clicked', async () => {
    const onPick = vi.fn();
    render(<StudioPicker onPick={onPick} busy={false} />);
    await userEvent.click(screen.getAllByRole('button')[0]);
    expect(onPick).toHaveBeenCalledWith(STUDIOS[0].id);
  });

  it('disables the cards while a session is being created', () => {
    render(<StudioPicker onPick={() => {}} busy />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });
});
