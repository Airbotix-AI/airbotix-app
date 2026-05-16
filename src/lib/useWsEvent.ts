import { useEffect } from 'react';

import { onWsEvent } from './ws';

/**
 * React hook subscribing to a single WS event for the lifetime of the component.
 * Pair with TanStack Query's invalidateQueries for live UI updates.
 */
export function useWsEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
  deps: unknown[] = [],
): void {
  useEffect(() => {
    return onWsEvent<T>(event, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
