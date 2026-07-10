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
import { fixPrompt, GameRunnerPane } from './GameRunnerPane';

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

// D-HARN-11a — the Ask-AI-fix prompt carries REAL evidence: the newest error
// (stable 'My game has an error' prefix — the backend keys previous-fix context
// injection on it), up to 3 older DISTINCT errors with locations, and the newest
// error's clipped stack in a fenced block; total clipped to ~3,000 chars.
describe('fixPrompt — multi-error + stack fix evidence (D-HARN-11a)', () => {
  const err = (text: string, opts?: Partial<ConsoleLine>): ConsoleLine => ({
    level: 'error',
    text,
    ...opts,
  });

  it('a single error keeps the exact legacy shape (stable backend prefix + closing line)', () => {
    expect(
      fixPrompt([err('TypeError: boom', { loc: { file: 'src/scenes/Game.js', line: 12, col: 1 } })]),
    ).toBe('My game has an error (in Game.js, line 12): TypeError: boom\nCan you fix it?');
    expect(fixPrompt([err('ReferenceError: x')])).toBe(
      'My game has an error: ReferenceError: x\nCan you fix it?',
    );
  });

  it('lists up to 3 older DISTINCT errors with their locations, newest leading', () => {
    const p = fixPrompt([
      err('E1', { loc: { file: 'a.js', line: 1, col: 1 } }), // 5th distinct — dropped
      err('E2'),
      err('E2'), // duplicate — deduped
      err('E3', { loc: { file: 'b.js', line: 2, col: 1 } }),
      err('E4'),
      err('E5', { loc: { file: 'src/c.js', line: 9, col: 1 } }), // newest
    ]);
    expect(p.startsWith('My game has an error (in c.js, line 9): E5')).toBe(true);
    expect(p).toContain('Other recent errors:');
    expect(p).toContain('\n- E4');
    expect(p).toContain('\n- (in b.js, line 2) E3');
    expect(p).toContain('\n- E2');
    expect(p).not.toContain('E1');
    expect(p.endsWith('\nCan you fix it?')).toBe(true);
  });

  it("attaches only the NEWEST error's stack, fenced", () => {
    const p = fixPrompt([
      err('old error', { stack: 'OLD STACK' }),
      err('TypeError: boom', { stack: 'TypeError: boom\n    at create (Game.js:3:5)' }),
    ]);
    expect(p).toContain(
      'Stack of the newest error:\n```\nTypeError: boom\n    at create (Game.js:3:5)\n```',
    );
    expect(p).not.toContain('OLD STACK');
    expect(p.endsWith('\nCan you fix it?')).toBe(true);
  });

  it('ignores non-error lines and the ready marker', () => {
    const p = fixPrompt([
      { level: 'info', text: 'ready' },
      { level: 'warn', text: 'a warning' },
      err('TypeError: boom'),
    ]);
    expect(p).toBe('My game has an error: TypeError: boom\nCan you fix it?');
  });

  it('clips to the 3,000-char cap and still ends with the stable closing line', () => {
    const p = fixPrompt([err('x'.repeat(5_000), { stack: 'y'.repeat(1_000) })]);
    expect(p.length).toBeLessThanOrEqual(3_000);
    expect(p.startsWith('My game has an error')).toBe(true);
    expect(p.endsWith('\nCan you fix it?')).toBe(true);
  });

  it('a clip landing INSIDE the stack fence re-balances the ``` fences', () => {
    // Error text sized so the 3,000-char clip cuts mid-stack: the opening fence
    // is in, the closing fence would be past the cap.
    const p = fixPrompt([err('x'.repeat(2_800), { stack: 'y'.repeat(1_000) })]);
    expect(p.length).toBeLessThanOrEqual(3_000);
    expect(p).toContain('Stack of the newest error:');
    // Balanced fences — never an unterminated ``` block in the prompt…
    expect((p.split('```').length - 1) % 2).toBe(0);
    // …and the stable closing line still ends the prompt (backend + demo matcher).
    expect(p.endsWith('\nCan you fix it?')).toBe(true);
    expect(p.startsWith('My game has an error')).toBe(true);
  });
});
