import { Navigate } from 'react-router-dom';

import { useAuthStore } from '@/auth/authStore';
import { useMe } from '@/auth/useAuth';

// `/` decides which surface (portal vs learn vs login) the visitor lands on.
export function RootPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const me = useMe();

  if (!accessToken) {
    return <Navigate to="/portal/login" replace />;
  }

  if (me.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading session…
      </div>
    );
  }

  if (!me.data) {
    return <Navigate to="/portal/login" replace />;
  }

  return <Navigate to={me.data.kind === 'kid' ? '/learn' : '/portal'} replace />;
}
