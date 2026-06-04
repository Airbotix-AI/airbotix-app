import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useWsEvent } from '@/lib/useWsEvent';
import { LiveAnnouncer } from './LiveAnnouncer';

vi.mock('@/lib/useWsEvent', () => ({ useWsEvent: vi.fn() }));
const mockedUseWsEvent = vi.mocked(useWsEvent);

// Capture each subscription's handler so tests can fire WS events synchronously.
const handlers = new Map<string, () => void>();

beforeEach(() => {
  handlers.clear();
  mockedUseWsEvent.mockImplementation(((event: string, handler: () => void) => {
    handlers.set(event, handler);
  }) as typeof useWsEvent);
});

describe('LiveAnnouncer', () => {
  it('renders a polite, atomic status region that starts empty', () => {
    render(<LiveAnnouncer announcements={[{ event: 'wallet.update', message: 'Stars changed.' }]} />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toBeEmptyDOMElement();
  });

  it('announces the mapped message when its WS event fires', () => {
    render(
      <LiveAnnouncer
        announcements={[
          { event: 'approval.new', message: 'New request waiting.' },
          { event: 'wallet.update', message: 'Stars changed.' },
        ]}
      />,
    );

    act(() => handlers.get('approval.new')?.());
    expect(screen.getByRole('status')).toHaveTextContent('New request waiting.');

    act(() => handlers.get('wallet.update')?.());
    expect(screen.getByRole('status')).toHaveTextContent('Stars changed.');
  });
});
