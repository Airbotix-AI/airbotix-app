// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { installStaleChunkRecovery } from "./staleChunkRecovery";

function makeWin(href = "http://localhost/learn/playground/p1") {
  const listeners = new Map<string, (e: Event) => void>();
  const store = new Map<string, string>();
  const win = {
    addEventListener: (t: string, fn: (e: Event) => void) => listeners.set(t, fn),
    location: { href, reload: vi.fn() },
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    },
  } as unknown as Window;
  const fire = () => {
    const e = new Event("vite:preloadError", { cancelable: true });
    listeners.get("vite:preloadError")!(e);
    return e;
  };
  return { win, fire };
}

describe("installStaleChunkRecovery (stale-chunk deploy race)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("first dynamic-import failure reloads once and suppresses the throw", () => {
    const { win, fire } = makeWin();
    installStaleChunkRecovery(win);
    const e = fire();
    expect(win.location.reload).toHaveBeenCalledTimes(1);
    expect(e.defaultPrevented).toBe(true);
  });

  it("a second failure at the SAME url falls through to the error boundary", () => {
    const { win, fire } = makeWin();
    installStaleChunkRecovery(win);
    fire();
    const second = fire();
    expect(win.location.reload).toHaveBeenCalledTimes(1); // no loop
    expect(second.defaultPrevented).toBe(false);
  });

  it("a failure at a DIFFERENT url gets its own single retry", () => {
    const { win, fire } = makeWin();
    installStaleChunkRecovery(win);
    fire();
    (win.location as { href: string }).href = "http://localhost/learn/create";
    fire();
    expect(win.location.reload).toHaveBeenCalledTimes(2);
  });
});
