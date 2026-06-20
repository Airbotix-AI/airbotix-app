import { useEffect } from 'react';

import type { PrincipalKind } from '@/auth/types';
import { onWsEvent } from './ws';

/**
 * React hook subscribing to a single WS event for the lifetime of the component.
 * Pair with TanStack Query's invalidateQueries for live UI updates.
 *
 * `kind` selects which authenticated socket to listen on (default `'kid'` for the
 * Learn surface). The teacher live viewer (`/teacher/*`) is a `user` principal, so
 * it passes `'user'` to receive `project.vfs.changed` on the teacher's socket.
 */
export function useWsEvent<T = unknown>(
  event: string,
  handler: (payload: T) => void,
  deps: unknown[] = [],
  kind: PrincipalKind = 'kid',
): void {
  useEffect(() => {
    return onWsEvent<T>(event, handler, kind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
