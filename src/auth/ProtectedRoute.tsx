import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuthStore } from './authStore';
import type { PrincipalKind } from './types';
import { useMe } from './useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  kind: PrincipalKind;
}

// Each session kind has its own login surface (auth-system-prd.md §3.2.1 v0.4).
function loginRoute(kind: PrincipalKind): string {
  if (kind === 'kid') return '/learn/login';
  if (kind === 'staff') return '/teacher/login';
  return '/portal/login';
}

export function ProtectedRoute({ children, kind }: ProtectedRouteProps) {
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.tokens[kind]);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const me = useMe(kind);

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
    return <Navigate to={loginRoute(kind)} state={{ from: location }} replace />;
  }

  if (me.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading session…
      </div>
    );
  }

  if (me.isError || !me.data) {
    return <Navigate to={loginRoute(kind)} replace />;
  }

  // Each surface validates its own principal (`useMe(kind)`), so no cross-surface
  // bounce: a parent and a kid can both be signed in and each surface is reachable
  // as long as that kind's session exists.
  return <>{children}</>;
}
