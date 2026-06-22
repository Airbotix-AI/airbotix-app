// @vitest-environment jsdom
// Live focus presence hook + shared focus ref (D-LIVE-3). Covers:
//  - emits `class.kid_focus { project_id, kind, title }` on mount when the kid is
//    in a live class and NOT readOnly;
//  - clears it (`project_id: null`) on unmount;
//  - no-op when NOT in a class (no class_id claim) or in the teacher read-only
//    viewer (readOnly);
//  - the shared current-focus ref the heartbeat re-emits tracks mount/unmount.

import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { sendWsEventMock, useKidClassIdMock } = vi.hoisted(() => ({
  sendWsEventMock: vi.fn(),
  useKidClassIdMock: vi.fn(),
}));

vi.mock('@/lib/ws', () => ({ sendWsEvent: sendWsEventMock }));
vi.mock('@/auth/authStore', () => ({ useKidClassId: useKidClassIdMock }));

import { getCurrentFocus, reEmitFocus, useReportFocus } from './reportFocus';

function Probe(props: {
  projectId?: string | null;
  kind: string;
  title?: string;
  readOnly?: boolean;
}) {
  useReportFocus(props.projectId, props.kind, props.title, props.readOnly);
  return null;
}

beforeEach(() => {
  sendWsEventMock.mockClear();
  useKidClassIdMock.mockReturnValue('class_1');
});
afterEach(() => cleanup());

describe('useReportFocus (D-LIVE-3)', () => {
  it('emits class.kid_focus on mount with the project + kind + title (kid socket)', () => {
    render(<Probe projectId="proj_1" kind="blocks" title="My Maze" />);
    expect(sendWsEventMock).toHaveBeenCalledWith(
      'class.kid_focus',
      { project_id: 'proj_1', kind: 'blocks', title: 'My Maze' },
      'kid',
    );
    expect(getCurrentFocus()).toEqual({ project_id: 'proj_1', kind: 'blocks', title: 'My Maze' });
  });

  it('clears the focus (project_id: null) on unmount + drops the shared ref', () => {
    const view = render(<Probe projectId="proj_1" kind="code" title="My Site" />);
    sendWsEventMock.mockClear();
    view.unmount();
    expect(sendWsEventMock).toHaveBeenCalledWith('class.kid_focus', { project_id: null }, 'kid');
    expect(getCurrentFocus()).toBeNull();
  });

  it('is a no-op when the kid is NOT in a class', () => {
    useKidClassIdMock.mockReturnValue(null);
    render(<Probe projectId="proj_1" kind="game" />);
    expect(sendWsEventMock).not.toHaveBeenCalled();
    expect(getCurrentFocus()).toBeNull();
  });

  it('is a no-op in the teacher read-only viewer (readOnly)', () => {
    render(<Probe projectId="proj_1" kind="game" readOnly />);
    expect(sendWsEventMock).not.toHaveBeenCalled();
    expect(getCurrentFocus()).toBeNull();
  });

  it('is a no-op when there is no projectId yet', () => {
    render(<Probe projectId={undefined} kind="game" />);
    expect(sendWsEventMock).not.toHaveBeenCalled();
  });
});

describe('reEmitFocus (heartbeat re-emit, D-LIVE-3)', () => {
  it('re-emits the current focus when one is set', () => {
    render(<Probe projectId="proj_9" kind="game" title="Spaceships" />);
    sendWsEventMock.mockClear();
    reEmitFocus();
    expect(sendWsEventMock).toHaveBeenCalledWith(
      'class.kid_focus',
      { project_id: 'proj_9', kind: 'game', title: 'Spaceships' },
      'kid',
    );
  });

  it('is a no-op when no project is focused', () => {
    // No Probe mounted → currentFocus is null after the prior test's cleanup.
    reEmitFocus();
    expect(sendWsEventMock).not.toHaveBeenCalled();
  });
});
