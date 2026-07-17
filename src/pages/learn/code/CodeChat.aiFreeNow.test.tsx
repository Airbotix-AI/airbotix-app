// @vitest-environment jsdom
// Workshop-free-AI waiver (workshop-free-ai-prd.md D-WFA-01): when a project is in
// its live free-workshop window, AI turns are FREE (0★). The Code Studio composer
// must (a) show "Free during workshop" in place of the star cost/balance, and (b)
// NOT gate the Ask button on a low/zero balance (the turn costs nothing). When the
// waiver is off, the normal "−2★" cost + `balance < cost` disable still apply.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CodeChat } from './CodeChat';

afterEach(cleanup);

const baseProps = {
  chat: [],
  busy: false,
  error: null,
  awaitingApproval: false,
  onApprove: vi.fn(),
  onReject: vi.fn(),
};

function typeIntoComposer() {
  fireEvent.change(screen.getByPlaceholderText(/want to build/i), {
    target: { value: 'make it purple' },
  });
}

describe('CodeChat — workshop-free-AI (D-WFA-01)', () => {
  it('free workshop at 0 balance: Ask button is enabled and shows "Free", no star cost', () => {
    render(<CodeChat {...baseProps} balance={0} aiFreeNow onSend={vi.fn()} />);

    // The balance hint is replaced with the free-workshop indicator.
    expect(screen.getByText(/Free during workshop/i)).toBeInTheDocument();
    expect(screen.queryByText(/★ left/)).not.toBeInTheDocument();

    const askBtn = screen.getByRole('button', { name: /Ask/i });
    // The label reads "Free", never a "−N★" cost.
    expect(askBtn).toHaveTextContent(/Free/i);
    expect(askBtn).not.toHaveTextContent(/★/);

    // With text entered, a 0 balance does NOT disable the button (the turn is free).
    typeIntoComposer();
    expect(askBtn).toBeEnabled();
  });

  it('free workshop actually sends at 0 balance', () => {
    const onSend = vi.fn();
    render(<CodeChat {...baseProps} balance={0} aiFreeNow onSend={onSend} />);

    typeIntoComposer();
    fireEvent.click(screen.getByRole('button', { name: /Ask/i }));
    expect(onSend).toHaveBeenCalledWith('make it purple');
  });

  it('waiver off at 0 balance: Ask shows the star cost and stays disabled', () => {
    render(<CodeChat {...baseProps} balance={0} aiFreeNow={false} onSend={vi.fn()} />);

    // Normal metered chrome: "−2★" cost + "0★ left" balance hint.
    expect(screen.getByText(/★ left/)).toBeInTheDocument();
    expect(screen.queryByText(/Free during workshop/i)).not.toBeInTheDocument();

    const askBtn = screen.getByRole('button', { name: /Ask/i });
    expect(askBtn).toHaveTextContent('★');

    // Even with text entered, a 0 balance keeps the button disabled (can't afford).
    typeIntoComposer();
    expect(askBtn).toBeDisabled();
  });
});
