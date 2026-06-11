import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Menu, X } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';
import { usePlaygroundStore } from '@/pages/learn/playground/playgroundStore';
import { useBlocksTheme } from '@/pages/learn/blocks/blocksTheme';
// the themed nav uses the pg-* tokens — ensure they're loaded on every Learn
// route (not only when the playground itself is mounted).
import '@/pages/learn/playground/playground.css';

const FLUID_ROUTES = ['/learn/workspace', '/learn/code', '/learn/playground'];

const NAV_ITEMS = [
  { to: '/learn/workspace', label: '✨ AI Studio' },
  { to: '/learn', label: 'Home', end: true },
  { to: '/learn/projects', label: 'Projects' },
  { to: '/learn/create', label: 'Create' },
  { to: '/learn/missions', label: 'Missions' },
  { to: '/learn/classroom', label: 'Class wall' },
];

export function LearnTopBar() {
  const me = useMe();
  const logout = useLogout();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : null;
  const { pathname } = useLocation();
  const fluid = FLUID_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // The inline nav collapses below `md` (portrait tablet / phone) into this menu.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]); // close on navigate

  // On the game/blocks studios the nav SYNCS with the studio theme: we set
  // `data-theme` on the header so the `pg-*` tokens flip (light ⇄ dark) to match
  // the immersive surface. Every other /learn page keeps the constant K-12 light
  // chrome.
  const onPlayground = pathname.startsWith('/learn/playground');
  const onBlocks = pathname.startsWith('/learn/blocks');
  const pgTheme = usePlaygroundStore((s) => s.theme);
  const blocksTheme = useBlocksTheme((s) => s.theme);
  const themed = onPlayground || onBlocks;
  const themeValue = onBlocks ? blocksTheme : pgTheme;

  return (
    <header
      data-theme={themed ? themeValue : undefined}
      className={clsx(
        'sticky top-0 z-20 border-b backdrop-blur px-6 py-4 md:px-10',
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
          {/* inline nav (≥ md) */}
          <nav className="hidden gap-2 md:flex">
            {NAV_ITEMS.map((item) => (
              <TopLink key={item.to} to={item.to} end={item.end} themed={themed}>
                {item.label}
              </TopLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
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
          {/* hamburger (< md) — opens the collapsed nav */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className={clsx(
              'grid h-10 w-10 place-items-center rounded-xl border md:hidden',
              themed
                ? 'border-pg-border text-pg-text hover:bg-pg-text/10'
                : 'border-hairline text-ink hover:bg-surface',
            )}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* collapsed nav menu (< md) */}
      {menuOpen && (
        <nav
          className={clsx(
            'mt-3 flex flex-col gap-1.5 border-t pt-3 md:hidden',
            !fluid && 'mx-auto max-w-5xl',
            themed ? 'border-pg-border' : 'border-hairline',
          )}
        >
          {NAV_ITEMS.map((item) => (
            <TopLink key={item.to} to={item.to} end={item.end} themed={themed} block>
              {item.label}
            </TopLink>
          ))}
        </nav>
      )}
    </header>
  );
}

function TopLink({
  to,
  end,
  themed,
  block,
  children,
}: {
  to: string;
  end?: boolean;
  themed?: boolean;
  /** Full-width stacked row for the collapsed (mobile) menu. */
  block?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'font-semibold transition-colors',
          block
            ? 'block w-full rounded-xl px-4 py-3 text-[16px]'
            : 'rounded-full px-4 py-1.5 text-[14px]',
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
