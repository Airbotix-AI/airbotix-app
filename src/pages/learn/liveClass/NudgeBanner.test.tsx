// @vitest-environment jsdom
// Transient teacher→kid nudge banner (D-LIVE-2). Covers:
//  - nothing renders until a `kid.nudge` arrives;
//  - a canned `coming` nudge shows the "coming to help" copy; a `note` nudge shows
//    the teacher's text;
//  - it is ONE-WAY: there is no reply control, only a dismiss (OK) button;
//  - [OK] dismisses it.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { onWsEventMock, handlers } = vi.hoisted(() => ({
  onWsEventMock: vi.fn(),
  handlers: new Map<string, (p: unknown) => void>(),
}));

vi.mock('@/lib/ws', () => ({
  onWsEvent: (event: string, handler: (p: unknown) => void) => {
    onWsEventMock(event);
    handlers.set(event, handler);
    return () => handlers.delete(event);
  },
}));

import { NudgeBanner } from './NudgeBanner';

function emitNudge(payload: { kind: 'coming' | 'note'; text?: string }) {
  act(() => handlers.get('kid.nudge')?.(payload));
}

beforeEach(() => {
  onWsEventMock.mockReset();
  handlers.clear();
});

afterEach(() => cleanup());

describe('NudgeBanner', () => {
  it('renders nothing until a kid.nudge arrives, and subscribes on the kid socket', () => {
    render(<NudgeBanner />);
    expect(onWsEventMock).toHaveBeenCalledWith('kid.nudge');
    expect(screen.queryByTestId('kid-nudge-banner')).not.toBeInTheDocument();
  });

  it('shows the canned "coming to help" copy for a coming nudge', () => {
    render(<NudgeBanner />);
    emitNudge({ kind: 'coming' });
    expect(screen.getByTestId('kid-nudge-banner')).toHaveTextContent('coming to help');
  });

  it('shows the teacher note text for a note nudge', () => {
    render(<NudgeBanner />);
    emitNudge({ kind: 'note', text: 'Try the green flag block!' });
    expect(screen.getByTestId('kid-nudge-banner')).toHaveTextContent('Try the green flag block!');
  });

  it('is one-way: a dismiss (OK) control exists, with NO reply/text input', () => {
    render(<NudgeBanner />);
    emitNudge({ kind: 'coming' });
    expect(screen.getByTestId('kid-nudge-dismiss')).toBeInTheDocument();
    // No way for the kid to write back — this is not a chat.
    expect(document.querySelector('input')).toBeNull();
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('[OK] dismisses the banner', () => {
    render(<NudgeBanner />);
    emitNudge({ kind: 'coming' });
    fireEvent.click(screen.getByTestId('kid-nudge-dismiss'));
    expect(screen.queryByTestId('kid-nudge-banner')).not.toBeInTheDocument();
  });
});
