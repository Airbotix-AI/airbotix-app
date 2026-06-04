import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChatPane } from './ChatPane';
import type { Message } from './WorkspacePage';

function msg(p: Partial<Message>): Message {
  return {
    id: 'm1',
    role: 'assistant',
    tool: null,
    content: 'hi',
    artifact_id: null,
    stars_charged: 0,
    created_at: '2026-06-01T10:00:00Z',
    ...p,
  } as Message;
}

describe('ChatPane', () => {
  it('renders the first-run empty state with suggestion chips', () => {
    render(<ChatPane messages={[]} loading={false} sending={false} tool="chat" empty />);
    expect(screen.getByRole('heading', { name: /What do you want to make/i })).toBeInTheDocument();
    expect(screen.getByText('Draw a robot dog')).toBeInTheDocument();
  });

  it('shows a loading line while messages load', () => {
    render(<ChatPane messages={[]} loading sending={false} tool="chat" empty={false} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the new-session hint when an active session has no messages', () => {
    render(<ChatPane messages={[]} loading={false} sending={false} tool="chat" empty={false} />);
    expect(screen.getByText(/New session/i)).toBeInTheDocument();
  });

  it('renders user + assistant bubbles, the stars charge, and a non-chat tool label', () => {
    render(
      <ChatPane
        messages={[
          msg({ id: 'u', role: 'user', content: 'draw a dog' }),
          msg({ id: 'a', role: 'assistant', tool: 'image', content: 'here you go', stars_charged: 3 }),
        ]}
        loading={false}
        sending={false}
        tool="image"
        empty={false}
      />,
    );
    expect(screen.getByText('draw a dog')).toBeInTheDocument();
    expect(screen.getByText('here you go')).toBeInTheDocument();
    expect(screen.getByText('−3★')).toBeInTheDocument();
    expect(screen.getByText('image')).toBeInTheDocument(); // tool label on the assistant bubble
  });

  it('shows a pending bubble while sending', () => {
    render(<ChatPane messages={[]} loading={false} sending tool="image" empty={false} />);
    expect(screen.getByText('Making your image…')).toBeInTheDocument();
  });
});
