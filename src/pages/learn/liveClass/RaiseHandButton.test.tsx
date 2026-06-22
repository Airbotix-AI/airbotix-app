// @vitest-environment jsdom
// Raise-hand control + shared store/hook (D-LIVE-1). Covers:
//  - the button is HIDDEN in the teacher read-only viewer and when the kid is in
//    no class, and VISIBLE only when in a class + not read-only;
//  - tapping emits `class.raise_hand` / `class.lower_hand` on the KID socket and
//    flips the state + testid (ask-teacher ⇄ raise-hand-waiting);
//  - a server `class.hand_lowered` (teacher lowered it) syncs the button to idle.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendWsEventMock, onWsEventMock, useKidClassIdMock, getKidSubMock, handlers } = vi.hoisted(
  () => ({
    sendWsEventMock: vi.fn(),
    onWsEventMock: vi.fn(),
    useKidClassIdMock: vi.fn(),
    getKidSubMock: vi.fn(),
    // event → handler, so a test can fire a server event.
    handlers: new Map<string, (p: unknown) => void>(),
  }),
);

vi.mock('@/lib/ws', () => ({
  sendWsEvent: sendWsEventMock,
  onWsEvent: (event: string, handler: (p: unknown) => void) => {
    onWsEventMock(event);
    handlers.set(event, handler);
    return () => handlers.delete(event);
  },
}));
vi.mock('@/auth/authStore', () => ({
  useKidClassId: useKidClassIdMock,
  getKidSub: getKidSubMock,
  // Stable token so the WS subscription effect runs (re-subscribes on token change).
  useKidToken: () => 'kid-token',
}));

import { RaiseHandButton } from './RaiseHandButton';
import { useRaiseHandStore } from './raiseHand';

beforeEach(() => {
  sendWsEventMock.mockReset();
  onWsEventMock.mockReset();
  handlers.clear();
  useKidClassIdMock.mockReset().mockReturnValue('class_test_001');
  getKidSubMock.mockReset().mockReturnValue('kid_1');
  // Reset the singleton store between tests.
  useRaiseHandStore.setState({ raised: false });
});

afterEach(() => cleanup());

describe('RaiseHandButton visibility gating', () => {
  it('is hidden in the teacher read-only viewer', () => {
    render(<RaiseHandButton readOnly />);
    expect(screen.queryByTestId('ask-teacher')).not.toBeInTheDocument();
    expect(screen.queryByTestId('raise-hand-waiting')).not.toBeInTheDocument();
  });

  it('is hidden when the kid is not in a class', () => {
    useKidClassIdMock.mockReturnValue(null);
    render(<RaiseHandButton />);
    expect(screen.queryByTestId('ask-teacher')).not.toBeInTheDocument();
  });

  it('shows the idle "Ask my teacher" button in a class', () => {
    render(<RaiseHandButton />);
    expect(screen.getByTestId('ask-teacher')).toBeInTheDocument();
  });
});

describe('RaiseHandButton raise / lower (own hand)', () => {
  it('raises: emits class.raise_hand on the kid socket and flips to the waiting cue', () => {
    render(<RaiseHandButton />);
    fireEvent.click(screen.getByTestId('ask-teacher'));
    expect(sendWsEventMock).toHaveBeenCalledWith('class.raise_hand', {}, 'kid');
    // No payload carries text/PII — args are event + empty object + socket kind.
    expect(screen.getByTestId('raise-hand-waiting')).toBeInTheDocument();
    expect(screen.queryByTestId('ask-teacher')).not.toBeInTheDocument();
  });

  it('lowers own: emits class.lower_hand and returns to idle', () => {
    useRaiseHandStore.setState({ raised: true });
    render(<RaiseHandButton />);
    fireEvent.click(screen.getByTestId('raise-hand-waiting'));
    expect(sendWsEventMock).toHaveBeenCalledWith('class.lower_hand', {}, 'kid');
    expect(screen.getByTestId('ask-teacher')).toBeInTheDocument();
  });
});

describe('RaiseHandButton syncs when the TEACHER lowers it', () => {
  it('a server class.hand_lowered returns the button to idle', () => {
    useRaiseHandStore.setState({ raised: true });
    render(<RaiseHandButton />);
    expect(screen.getByTestId('raise-hand-waiting')).toBeInTheDocument();
    // Subscribed on the kid socket.
    expect(onWsEventMock).toHaveBeenCalledWith('class.hand_lowered');
    // Teacher lowers it server-side → broadcast arrives.
    act(() => handlers.get('class.hand_lowered')?.({ kid_id: 'kid_1' }));
    expect(screen.getByTestId('ask-teacher')).toBeInTheDocument();
  });

  it('ignores a class.hand_lowered for a DIFFERENT kid (own-id filter)', () => {
    useRaiseHandStore.setState({ raised: true });
    render(<RaiseHandButton />);
    // Another kid's hand is lowered — this kid's button must stay up.
    act(() => handlers.get('class.hand_lowered')?.({ kid_id: 'some_other_kid' }));
    expect(screen.getByTestId('raise-hand-waiting')).toBeInTheDocument();
  });
});
