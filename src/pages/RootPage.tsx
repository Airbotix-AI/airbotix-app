import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/auth/authStore';

// `/` decides which surface (portal vs learn vs login) the visitor lands on.
// With dual sessions a browser may hold both; prefer the parent surface, then
// kid, then the login screen.
export function RootPage() {
  const userToken = useAuthStore((s) => s.tokens.user);
  const kidToken = useAuthStore((s) => s.tokens.kid);

  if (userToken) {
    return <Navigate to="/portal" replace />;
  }
  if (kidToken) {
    return <Navigate to="/learn" replace />;
  }
  return <Navigate to="/portal/login" replace />;
}
