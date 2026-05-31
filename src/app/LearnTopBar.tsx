import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';

const FLUID_ROUTES = ['/learn/workspace', '/learn/code'];

export function LearnTopBar() {
  const me = useMe();
  const logout = useLogout();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : null;
  const { pathname } = useLocation();
  const fluid = FLUID_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <header className="sticky top-0 z-10 border-b border-hairline bg-canvas-pure/95 backdrop-blur px-6 py-4 md:px-10">
      <div className={clsx('flex items-center justify-between', !fluid && 'mx-auto max-w-5xl')}>
        <div className="flex items-center gap-8">
          <NavLink to="/learn" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-grad-bubblegum shadow-brand-bubblegum">
              <span className="text-[18px] font-extrabold text-white">A</span>
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.10em] text-slate2 leading-none">
                Airbotix
              </div>
              <div className="text-[15px] font-bold text-ink leading-tight">Learn</div>
            </div>
          </NavLink>
          <nav className="hidden gap-2 md:flex">
            <TopLink to="/learn/workspace">✨ AI Studio</TopLink>
            <TopLink to="/learn" end>Home</TopLink>
            <TopLink to="/learn/projects">Projects</TopLink>
            <TopLink to="/learn/create">Create</TopLink>
            <TopLink to="/learn/missions">Missions</TopLink>
            <TopLink to="/learn/classroom">Class wall</TopLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {nickname && (
            <div className="hidden sm:block text-[14px] text-ink-soft">
              I'm <span className="font-bold text-ink">{nickname}</span>
            </div>
          )}
          <button onClick={() => logout(false)} className="btn-pill-ghost">
            Sign out
          </button>
        </div>
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
        clsx(
          'rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors',
          isActive
            ? 'bg-wash-bubblegum text-ink'
            : 'text-ink-soft hover:text-ink hover:bg-surface',
        )
      }
    >
      {children}
    </NavLink>
  );
}
