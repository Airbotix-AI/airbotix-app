// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

// Capture the `files` the (mocked) GameFrame receives on each render, so we can
// assert the running game only re-runs when runKey bumps — not on every autosave.
const seen: unknown[] = [];
vi.mock('../GameFrame', () => ({
  GameFrame: (props: { files: unknown }) => {
    seen.push(props.files);
    return null;
  },
}));

import { GameRunnerPane } from './GameRunnerPane';

const F = (...paths: string[]) => paths.map((p) => ({ path: p, content: 'x', kind: 'text' as const, size: 1 }));
const noop = () => {};

beforeEach(() => {
  seen.length = 0;
  // The stage uses a ResizeObserver, which jsdom doesn't implement.
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('GameRunnerPane — the running game uses a launch snapshot of the VFS', () => {
  it('keeps the snapshot on a files change without a runKey bump (autosave), and re-snapshots when runKey bumps (Play)', () => {
    const a = F('main.js');
    const { rerender } = render(
      <GameRunnerPane files={a} runKey={1} running onRun={noop} onOpenLocation={noop} onAskFix={noop} />,
    );
    expect(seen.at(-1)).toBe(a);

    // Autosave commits a draft → `files` changes, runKey unchanged. The running
    // game must NOT reload — GameFrame still gets the launch snapshot.
    const b = F('main.js', 'b.js');
    rerender(<GameRunnerPane files={b} runKey={1} running onRun={noop} onOpenLocation={noop} onAskFix={noop} />);
    expect(seen.at(-1)).toBe(a);

    // ▶ Play / restart / AI turn bumps runKey → re-snapshot to the latest files.
    const c = F('main.js', 'c.js');
    rerender(<GameRunnerPane files={c} runKey={2} running onRun={noop} onOpenLocation={noop} onAskFix={noop} />);
    expect(seen.at(-1)).toBe(c);
  });
});
