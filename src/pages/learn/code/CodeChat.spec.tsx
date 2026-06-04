import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CodeChat } from './CodeChat';

const baseProps = {
  chat: [],
  busy: false,
  balance: 10,
  error: null,
  awaitingApproval: false,
  onSend: vi.fn(),
  onApprove: vi.fn(),
  onReject: vi.fn(),
};

describe('CodeChat', () => {
  it('shows the intro when the chat is empty', () => {
    render(<CodeChat {...baseProps} />);
    expect(screen.getByText(/Code Critter/)).toBeInTheDocument();
  });

  it('sends the typed message via the Ask button', async () => {
    const onSend = vi.fn();
    render(<CodeChat {...baseProps} onSend={onSend} />);
    await userEvent.type(screen.getByPlaceholderText(/What do you want to build/), 'make a button');
    await userEvent.click(screen.getByRole('button', { name: /Ask/ }));
    expect(onSend).toHaveBeenCalledWith('make a button');
  });

  it('offers approve / reject while a plan awaits approval', async () => {
    const onApprove = vi.fn();
    render(<CodeChat {...baseProps} awaitingApproval onApprove={onApprove} />);
    await userEvent.click(screen.getByRole('button', { name: /Yes, do it/ }));
    expect(onApprove).toHaveBeenCalled();
  });

  it('disables Ask when the balance is below the turn cost', async () => {
    render(<CodeChat {...baseProps} balance={1} />);
    await userEvent.type(screen.getByPlaceholderText(/What do you want to build/), 'go');
    expect(screen.getByRole('button', { name: /Ask/ })).toBeDisabled();
  });
});
