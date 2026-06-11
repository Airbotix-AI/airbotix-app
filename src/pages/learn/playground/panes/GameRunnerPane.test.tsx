// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

// Capture the `files` the (mocked) GameFrame receives on each render, so we can
// assert the running game only re-runs when runKey bumps — not on every autosave.
// `latestOnConsole` lets the console tests feed real lines through the pane.
const seen: unknown[] = [];
let latestOnConsole: ((lines: ConsoleLine[]) => void) | undefined;
vi.mock('../GameFrame', () => ({
  GameFrame: (props: { files: unknown; onConsole?: (lines: ConsoleLine[]) => void }) => {
    seen.push(props.files);
    latestOnConsole = props.onConsole;
    return null;
  },
}));

import type { ConsoleLine } from '../buildGamePreview';
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

describe('GameRunnerPane — the console pins to the latest output', () => {
  // jsdom does no layout, so give every element fixed scroll metrics: content
  // is 1000px tall in a 200px viewport. "Bottom" = scrollTop 800 (within the
  // hook's 40px threshold); scrollTop is a plain writable property in jsdom.
  const SCROLL_HEIGHT = 1000;
  const CLIENT_HEIGHT = 200;
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => SCROLL_HEIGHT,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => CLIENT_HEIGHT,
    });
  });
  afterEach(() => {
    cleanup();
    delete (HTMLElement.prototype as { scrollHeight?: unknown }).scrollHeight;
    delete (HTMLElement.prototype as { clientHeight?: unknown }).clientHeight;
  });

  const line = (text: string): ConsoleLine => ({ level: 'error', text });

  /** Render a running pane, feed it `lines`, and open the console panel. */
  function openConsoleWith(lines: ConsoleLine[]): HTMLElement {
    render(
      <GameRunnerPane files={F('main.js')} runKey={1} running onRun={noop} onOpenLocation={noop} onAskFix={noop} />,
    );
    act(() => latestOnConsole?.(lines));
    // An error auto-opens the console; for log-only feeds, toggle it open.
    if (!screen.queryByTestId('console-list')) {
      fireEvent.click(screen.getByLabelText('Toggle console'));
    }
    return screen.getByTestId('console-list');
  }

  it('opens scrolled to the bottom (the newest line is in view)', () => {
    const list = openConsoleWith([line('old'), line('TypeError: newest')]);
    expect(list.scrollTop).toBe(SCROLL_HEIGHT);
  });

  it('follows new lines while at/near the bottom', () => {
    const list = openConsoleWith([line('first')]);
    list.scrollTop = SCROLL_HEIGHT - CLIENT_HEIGHT; // exactly at the bottom
    fireEvent.scroll(list);
    act(() => latestOnConsole?.([line('first'), line('second')]));
    expect(list.scrollTop).toBe(SCROLL_HEIGHT); // glued to the new bottom
  });

  it('never yanks the view down after the kid scrolls up', () => {
    const list = openConsoleWith([line('first')]);
    list.scrollTop = 0; // deliberately scrolled up to read older output
    fireEvent.scroll(list);
    act(() => latestOnConsole?.([line('first'), line('second')]));
    expect(list.scrollTop).toBe(0); // stays where the kid put it
  });
});
