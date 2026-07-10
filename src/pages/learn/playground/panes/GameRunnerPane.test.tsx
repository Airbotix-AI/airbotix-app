// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
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

  it('re-snapshots when the ENGINE changes (2D⇄3D switch) — even without a runKey bump (D-3D-08)', () => {
    // Otherwise the live `engine` prop would render the new engine's global against
    // the OLD engine's snapshot files → "Phaser/THREE is not defined".
    const twoD = F('main.js');
    const { rerender } = render(
      <GameRunnerPane files={twoD} runKey={1} running engine="phaser" onRun={noop} onOpenLocation={noop} onAskFix={noop} />,
    );
    expect(seen.at(-1)).toBe(twoD);

    // Switch confirmed: engine flips to three + the VFS is replaced (same commit),
    // runKey unchanged. The runner MUST re-snapshot to the new (three) files.
    const threeD = F('main.js', 'src/scene.js');
    rerender(
      <GameRunnerPane files={threeD} runKey={1} running engine="three" onRun={noop} onOpenLocation={noop} onAskFix={noop} />,
    );
    expect(seen.at(-1)).toBe(threeD);
  });
});

// D-HARN-03 — "Ask AI to fix" is a send-path button: while an AI turn is busy it
// renders DISABLED so a tap never silently vanishes into an in-flight turn.
describe('GameRunnerPane — "Ask AI to fix" disabled while a turn is busy (D-HARN-03)', () => {
  // The earlier describe doesn't clean up between tests — start (and stay) clean
  // so `getByTestId` never matches a stale pane.
  beforeEach(cleanup);
  afterEach(cleanup);
  const errs: ConsoleLine[] = [{ level: 'error', text: 'TypeError: boom' }];

  it('renders disabled while busy and does not fire onAskFix', () => {
    const onAskFix = vi.fn();
    render(
      <GameRunnerPane
        files={F('main.js')}
        runKey={1}
        running
        busy
        onRun={noop}
        onOpenLocation={noop}
        onAskFix={onAskFix}
      />,
    );
    act(() => latestOnConsole?.(errs));
    const btn = screen.getByTestId('ask-ai-fix') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.click(btn);
    expect(onAskFix).not.toHaveBeenCalled();
  });

  it('is enabled when no turn is busy and sends the fix prompt', () => {
    const onAskFix = vi.fn();
    render(
      <GameRunnerPane
        files={F('main.js')}
        runKey={1}
        running
        onRun={noop}
        onOpenLocation={noop}
        onAskFix={onAskFix}
      />,
    );
    act(() => latestOnConsole?.(errs));
    const btn = screen.getByTestId('ask-ai-fix') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    fireEvent.click(btn);
    expect(onAskFix).toHaveBeenCalledTimes(1);
    expect(onAskFix.mock.calls[0][0]).toContain('TypeError: boom');
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

  // Teacher live read-only viewer (D-LV-6): "Ask AI to fix" runs a (gated) AI turn,
  // so it must be hidden — a teacher never sees a dead control. The game still runs
  // and the console still shows; only the AI affordance is gone.
  it('hides "Ask AI to fix" in the read-only viewer but shows it for the kid', () => {
    const errs = [line('TypeError: boom')];

    const { rerender } = render(
      <GameRunnerPane
        files={F('main.js')}
        runKey={1}
        running
        onRun={noop}
        onOpenLocation={noop}
        onAskFix={noop}
        readOnly
      />,
    );
    act(() => latestOnConsole?.(errs));
    // The console panel still opens on the error; only the AI fix chip is absent.
    expect(screen.getByTestId('console-list')).toBeInTheDocument();
    expect(screen.queryByText(/Ask AI to fix/i)).not.toBeInTheDocument();

    // Kid mode (readOnly absent): the chip is present.
    rerender(
      <GameRunnerPane
        files={F('main.js')}
        runKey={1}
        running
        onRun={noop}
        onOpenLocation={noop}
        onAskFix={noop}
      />,
    );
    act(() => latestOnConsole?.(errs));
    expect(screen.getByText(/Ask AI to fix/i)).toBeInTheDocument();
  });
});
