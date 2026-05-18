import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from './authStore';
import type { PrincipalKind } from './types';
import { useMe } from './useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  kind: PrincipalKind;
}

export function ProtectedRoute({ children, kind }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const me = useMe();

  // Wait for the one-shot /auth/refresh on app mount to settle. Without this,
  // a page reload always sees accessToken=null on the first render and would
  // immediately bounce the user to /login even when the HttpOnly refresh cookie
  // is valid.
  if (!bootstrapped) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading session…
      </div>
    );
  }

  if (!accessToken && !me.isLoading) {
    const fallback = kind === 'user' ? '/portal/login' : '/learn/login';
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  if (me.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading session…
      </div>
    );
  }

  if (me.isError || !me.data) {
    const fallback = kind === 'user' ? '/portal/login' : '/learn/login';
    return <Navigate to={fallback} replace />;
  }

  // Cross-surface: kid logged in trying to enter /portal/* → bounce to /learn.
  // Parent trying to enter /learn/* → bounce to /portal.
  if (me.data.kind !== kind) {
    const elsewhere = me.data.kind === 'user' ? '/portal' : '/learn';
    return <Navigate to={elsewhere} replace />;
  }

  return <>{children}</>;
}
