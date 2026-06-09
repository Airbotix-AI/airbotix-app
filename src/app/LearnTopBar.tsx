import clsx from 'clsx';
import { NavLink, useLocation } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';
import { usePlaygroundStore } from '@/pages/learn/playground/playgroundStore';

const FLUID_ROUTES = ['/learn/workspace', '/learn/code', '/learn/playground'];

export function LearnTopBar() {
  const me = useMe();
  const logout = useLogout();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : null;
  const { pathname } = useLocation();
  const fluid = FLUID_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // On the game studio the nav SYNCS with the playground theme: we set
  // `data-theme` on the header so the `pg-*` tokens flip (light ⇄ dark) to match
  // the studio. Every other /learn page keeps the constant K-12 light chrome.
  const onPlayground = pathname.startsWith('/learn/playground');
  const pgTheme = usePlaygroundStore((s) => s.theme);
  const themed = onPlayground;

  return (
    <header
      data-theme={themed ? pgTheme : undefined}
      className={clsx(
        'sticky top-0 z-10 border-b backdrop-blur px-6 py-4 md:px-10',
        themed ? 'border-pg-border bg-pg-surface/95 text-pg-text' : 'border-hairline bg-canvas-pure/95',
      )}
    >
      <div className={clsx('flex items-center justify-between', !fluid && 'mx-auto max-w-5xl')}>
        <div className="flex items-center gap-8">
          <NavLink to="/learn" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-grad-bubblegum shadow-brand-bubblegum">
              <span className="text-[18px] font-extrabold text-white">A</span>
            </div>
            <div>
              <div
                className={clsx(
                  'text-[10px] font-bold uppercase tracking-[0.10em] leading-none',
                  themed ? 'text-pg-text-muted' : 'text-slate2',
                )}
              >
                Airbotix
              </div>
              <div
                className={clsx('text-[15px] font-bold leading-tight', themed ? 'text-pg-text' : 'text-ink')}
              >
                Learn
              </div>
            </div>
          </NavLink>
          <nav className="hidden gap-2 md:flex">
            <TopLink to="/learn/workspace" themed={themed}>✨ AI Studio</TopLink>
            <TopLink to="/learn" end themed={themed}>Home</TopLink>
            <TopLink to="/learn/projects" themed={themed}>Projects</TopLink>
            <TopLink to="/learn/create" themed={themed}>Create</TopLink>
            <TopLink to="/learn/missions" themed={themed}>Missions</TopLink>
            <TopLink to="/learn/classroom" themed={themed}>Class wall</TopLink>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {nickname && (
            <div
              className={clsx(
                'hidden sm:block text-[14px]',
                themed ? 'text-pg-text-dim' : 'text-ink-soft',
              )}
            >
              I'm{' '}
              <span className={clsx('font-bold', themed ? 'text-pg-text' : 'text-ink')}>{nickname}</span>
            </div>
          )}
          <button
            onClick={() => logout('kid', false)}
            className={clsx(
              themed
                ? 'rounded-full border border-pg-border px-4 py-1.5 text-[14px] font-semibold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text'
                : 'btn-pill-ghost',
            )}
          >
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
  themed,
  children,
}: {
  to: string;
  end?: boolean;
  themed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors',
          themed
            ? isActive
              ? 'bg-brand-bubblegum/20 text-pg-text'
              : 'text-pg-text-dim hover:bg-pg-text/10 hover:text-pg-text'
            : isActive
              ? 'bg-wash-bubblegum text-ink'
              : 'text-ink-soft hover:text-ink hover:bg-surface',
        )
      }
    >
      {children}
    </NavLink>
  );
}
