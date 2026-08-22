import { useEffect, useRef } from 'react';

import type { PrincipalKind } from '@/auth/types';
import { api } from '@/lib/api';

/**
 * Records one first-party product-surface open per mounted app shell.
 * The backend derives the surface and identity from the JWT; no route, query,
 * email, nickname or other client data is sent.
 */
export function useProductOpenTracking(principal: PrincipalKind) {
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current) return;
    reported.current = true;

    void api('/analytics/open', { method: 'POST', principal }).catch(() => {
      // A transient failure may retry if the shell remounts; telemetry must never
      // interrupt or visibly degrade the Parent or Kids experience.
      reported.current = false;
    });
  }, [principal]);
}
