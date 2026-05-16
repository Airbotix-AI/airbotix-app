import { NavLink } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';

// V0: simple top bar. Kid-friendly visual identity (big buttons, mascot, color
// palette) is deferred to a later round — see airbotix-app-learn-prd.md §UI/UX.
export function LearnTopBar() {
  const me = useMe();
  const logout = useLogout();

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex items-center gap-6">
        <NavLink to="/learn" className="text-lg font-semibold text-charcoal">
          Airbotix Learn
        </NavLink>
        <nav className="hidden gap-4 md:flex">
          <TopLink to="/learn" end>Home</TopLink>
          <TopLink to="/learn/projects">Projects</TopLink>
          <TopLink to="/learn/missions">Missions</TopLink>
          <TopLink to="/learn/wall">Class Wall</TopLink>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        {me.data?.kind === 'kid' && (
          <div className="text-sm text-charcoal">
            I'm <span className="font-semibold">{me.data.nickname}</span>
          </div>
        )}
        <button
          onClick={() => logout(false)}
          className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

function TopLink({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive
          ? 'text-sm font-semibold text-brand-700'
          : 'text-sm text-charcoal hover:text-brand-600'
      }
    >
      {children}
    </NavLink>
  );
}
