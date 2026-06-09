// @vitest-environment jsdom
//
// FE1 — the teacher's "what shall we do next?" option chips (§11.4 / D-PAP-06):
// a settled agent bubble carrying `nextSteps` renders tappable chips, and tapping
// one sends its prompt as the next turn.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AIChatPanel } from './AIChatPanel';
import type { ChatItem } from './useGameAgent';

afterEach(cleanup);

describe('AIChatPanel — next-step option chips', () => {
  const chat: ChatItem[] = [
    {
      id: 'a1',
      role: 'agent',
      text: 'Your player can jump now! 🦘',
      nextSteps: [
        { label: 'Add a score', prompt: 'add a score', tag: 'concept' },
        { label: 'Make it bounce', prompt: 'make it bounce', tag: 'fun' },
      ],
    },
  ];

  it('renders one chip per next step, with the labels', () => {
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={vi.fn()} />);
    const chips = screen.getAllByTestId('next-step');
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toContain('Add a score');
    expect(chips[1].textContent).toContain('Make it bounce');
  });

  it('tapping a chip sends that option’s prompt', () => {
    const onSend = vi.fn();
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={onSend} />);
    fireEvent.click(screen.getAllByTestId('next-step')[1]);
    expect(onSend).toHaveBeenCalledWith('make it bounce');
  });

  it('renders no chip row when a bubble has no next steps', () => {
    const plain: ChatItem[] = [{ id: 'a2', role: 'agent', text: 'Done!' }];
    render(<AIChatPanel chat={plain} busy={false} error={null} onSend={vi.fn()} />);
    expect(screen.queryByTestId('next-steps')).toBeNull();
  });
});
