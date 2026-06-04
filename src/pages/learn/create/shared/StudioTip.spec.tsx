import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { StudioTip } from './StudioTip';

const examples = [
  { text: 'a friendly robot', hint: 'character' },
  { text: 'a cozy library' },
];

describe('StudioTip', () => {
  it('renders the tip + examples and reports the picked one', async () => {
    const onPick = vi.fn();
    render(
      <StudioTip color="bubblegum" tipTitle="Prompt secret" tipBody="Be vivid." examples={examples} onPick={onPick} />,
    );
    expect(screen.getByText('Be vivid.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'a friendly robot' }));
    expect(onPick).toHaveBeenCalledWith('a friendly robot');
  });

  it('can be hidden and re-shown', async () => {
    render(
      <StudioTip color="mint" tipTitle="Tip" tipBody="Body" examples={examples} onPick={() => {}} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.getByRole('button', { name: /Show tips & examples/ })).toBeInTheDocument();
  });
});
