import type { ReactNode } from 'react';

import type { PrincipalKind } from './types';
import { useMe } from './useAuth';

interface RoleGateProps {
  kinds: PrincipalKind[];
  children: ReactNode;
  fallback?: ReactNode;
}

// Client-side gate for UX only. The backend enforces all authorization
// (auth-system-prd.md §3.4).
export function RoleGate({ kinds, children, fallback = null }: RoleGateProps) {
  const me = useMe();
  if (!me.data) return null;
  if (!kinds.includes(me.data.kind)) return <>{fallback}</>;
  return <>{children}</>;
}
