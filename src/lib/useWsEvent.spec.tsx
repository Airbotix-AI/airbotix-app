import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import * as ws from './ws';
import { useWsEvent } from './useWsEvent';

describe('useWsEvent', () => {
  it('subscribes on mount and unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    const handler = vi.fn();
    const spy = vi.spyOn(ws, 'onWsEvent').mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useWsEvent('wallet.update', handler));

    expect(spy).toHaveBeenCalledWith('wallet.update', handler);
    expect(unsubscribe).not.toHaveBeenCalled();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('re-subscribes when deps change', () => {
    const unsubscribe = vi.fn();
    const spy = vi.spyOn(ws, 'onWsEvent').mockReturnValue(unsubscribe);

    const { rerender } = renderHook(
      ({ id }: { id: string }) => useWsEvent('approval.new', () => undefined, [id]),
      { initialProps: { id: 'a' } },
    );
    expect(spy).toHaveBeenCalledTimes(1);

    rerender({ id: 'b' });
    expect(unsubscribe).toHaveBeenCalledTimes(1); // old subscription torn down
    expect(spy).toHaveBeenCalledTimes(2); // new subscription mounted
  });

  it('does not re-subscribe when deps are unchanged', () => {
    const spy = vi.spyOn(ws, 'onWsEvent').mockReturnValue(() => undefined);

    const { rerender } = renderHook(
      ({ id }: { id: string }) => useWsEvent('approval.new', () => undefined, [id]),
      { initialProps: { id: 'a' } },
    );
    rerender({ id: 'a' });
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
