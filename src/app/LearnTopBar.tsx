import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { ChevronDown, Menu, X } from 'lucide-react';
import { matchPath, NavLink, useLocation } from 'react-router-dom';

import { useLogout, useMe } from '@/auth/useAuth';
import { KidAvatar } from '@/components/KidAvatar';
import { SHOW_LESSONS_CATALOG } from '@/lib/features';
import { usePlaygroundStore } from '@/pages/learn/playground/playgroundStore';
import { useBlocksTheme } from '@/pages/learn/blocks/blocksTheme';
// the themed nav uses the pg-* tokens — ensure they're loaded on every Learn
// route (not only when the playground itself is mounted).
import '@/pages/learn/playground/playground.css';

const FLUID_ROUTES = ['/learn/workspace', '/learn/code', '/learn/playground'];

// Exported for the copy-split guard. This nav points at the course-CONTENT catalog
// (课节), so its label is "Lessons"; the kid's TASK inside a lesson is a "Mission".
// `missions` survives in the route path solely as the internal route/code identifier.
// (Pre-existing data export beside the component; the fast-refresh warning is benign
// here and would otherwise fail the deploy's --max-warnings 0 lint.)
// eslint-disable-next-line react-refresh/only-export-components
export const NAV_ITEMS = [
  { to: '/learn', label: 'Home', end: true },
  { to: '/learn/create', label: 'Create' },
  { to: '/learn/projects', label: 'Projects' },
  { to: '/learn/classroom', label: 'Classes' },
  { to: '/learn/passport', label: 'Passport' },
  { to: '/learn/workspace', label: 'AI Studio' },
  { to: '/learn/missions', label: 'Lessons' },
  { to: '/learn/hsc', label: 'HSC Plan' },
];

// The Lessons catalog is temporarily hidden (features.ts SHOW_LESSONS_CATALOG);
// NAV_ITEMS above stays the full canonical list so the copy-split guard keeps
// pinning the Lesson/Mission wording.
export const VISIBLE_NAV_ITEMS = NAV_ITEMS.filter(
  (item) => SHOW_LESSONS_CATALOG || item.to !== '/learn/missions',
);

const PRIMARY_NAV_PATHS = new Set([
  '/learn',
  '/learn/workspace',
  '/learn/create',
  '/learn/projects',
  '/learn/classroom',
  '/learn/passport',
]);

export const PRIMARY_NAV_ITEMS = VISIBLE_NAV_ITEMS.filter((item) =>
  PRIMARY_NAV_PATHS.has(item.to),
);

export const MORE_NAV_ITEMS = VISIBLE_NAV_ITEMS.filter(
  (item) => !PRIMARY_NAV_PATHS.has(item.to),
);

// Walk-in (unclaimed) workshop kids see ONLY their class + their kid code
// (auth-system-prd §5.2). Deep working routes (studios/projects launched from
// the class) stay reachable — this trims the top-level catalog surfaces.
// eslint-disable-next-line react-refresh/only-export-components
export const WALK_IN_NAV_ITEMS = [
  { to: '/learn/classroom', label: 'My Classes', end: undefined as boolean | undefined },
  { to: '/learn/passport', label: 'Passport', end: undefined as boolean | undefined },
  { to: '/learn/profile', label: '🎟️ My code', end: undefined as boolean | undefined },
];

export function LearnTopBar() {
  const me = useMe();
  const logout = useLogout();
  const nickname = me.data?.kind === 'kid' ? me.data.nickname : null;
  const avatarId = me.data?.kind === 'kid' ? me.data.avatar_id : null;
  const isWalkIn = me.data?.kind === 'kid' && me.data.is_ephemeral === true;
  const navItems = isWalkIn ? WALK_IN_NAV_ITEMS : VISIBLE_NAV_ITEMS;
  const { pathname } = useLocation();
  const fluid = FLUID_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // The inline nav collapses below `xl` so tablets never inherit a squeezed row.
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    setMenuOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  const primaryItems = isWalkIn ? navItems : PRIMARY_NAV_ITEMS;
  const moreItems = isWalkIn ? [] : MORE_NAV_ITEMS;
  const moreRouteActive = moreItems.some((item) =>
    matchPath({ path: item.to, end: item.end ?? false }, pathname),
  );

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
        'sticky top-0 z-20 border-b px-5 py-3 backdrop-blur sm:px-7 xl:px-10',
        themed
          ? 'border-pg-border bg-pg-surface/95 text-pg-text'
          : 'border-hairline bg-canvas-pure/95',
      )}
    >
      <div
        className={clsx(
          'mx-auto flex w-full items-center justify-between gap-4',
          fluid ? 'max-w-none' : 'max-w-[1440px]',
        )}
      >
        <div className="flex min-w-0 items-center gap-5 2xl:gap-8">
          <NavLink
            to="/learn"
            aria-label="Airbotix Learn home"
            className="flex shrink-0 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-bubblegum"
          >
            <img
              src="/logo-black-horizontal.png"
              alt="Airbotix"
              className={clsx('h-8 w-auto sm:h-9', themed && 'brightness-0 invert')}
            />
            <span
              className={clsx(
                'hidden border-l pl-3 text-[11px] font-bold uppercase tracking-[0.12em] sm:block',
                themed ? 'border-pg-border text-pg-text-muted' : 'border-hairline text-slate2',
              )}
            >
              Kids Studio
            </span>
          </NavLink>
          <nav aria-label="Learn primary" className="hidden items-center gap-1 xl:flex">
            {primaryItems.map((item) => (
              <TopLink key={item.to} to={item.to} end={item.end} themed={themed}>
                {item.label}
              </TopLink>
            ))}
            {moreItems.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  aria-expanded={moreOpen}
                  aria-controls="learn-more-navigation"
                  onClick={() => setMoreOpen((open) => !open)}
                  className={clsx(
                    'flex items-center gap-1 rounded-full px-3 py-2 text-[14px] font-semibold transition-colors',
                    themed
                      ? moreOpen || moreRouteActive
                        ? 'bg-brand-bubblegum/20 text-pg-text'
                        : 'text-pg-text-dim hover:bg-pg-text/10 hover:text-pg-text'
                      : moreOpen || moreRouteActive
                        ? 'bg-wash-bubblegum text-ink'
                        : 'text-ink-soft hover:bg-surface hover:text-ink',
                  )}
                >
                  More
                  <ChevronDown
                    aria-hidden="true"
                    className={clsx('h-4 w-4 transition-transform', moreOpen && 'rotate-180')}
                  />
                </button>
                {moreOpen && (
                  <nav
                    id="learn-more-navigation"
                    aria-label="More Learn navigation"
                    className={clsx(
                      'absolute left-0 top-[calc(100%+0.65rem)] z-40 min-w-44 space-y-1 rounded-2xl border p-2 shadow-card-soft',
                      themed
                        ? 'border-pg-border bg-pg-surface text-pg-text'
                        : 'border-hairline bg-canvas-pure text-ink',
                    )}
                  >
                    {moreItems.map((item) => (
                      <TopLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        themed={themed}
                        block
                      >
                        {item.label}
                      </TopLink>
                    ))}
                  </nav>
                )}
              </div>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          {nickname && (
            <div className="hidden items-center gap-2 sm:flex">
              <KidAvatar avatarId={avatarId} nickname={nickname} size="sm" />
              <div className={clsx('text-[14px]', themed ? 'text-pg-text-dim' : 'text-ink-soft')}>
                I'm{' '}
                <span className={clsx('font-bold', themed ? 'text-pg-text' : 'text-ink')}>
                  {nickname}
                </span>
              </div>
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
          {/* hamburger (< xl) — avoids squeezing kid navigation on tablets. */}
          <button
            type="button"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className={clsx(
              'grid h-10 w-10 place-items-center rounded-xl border xl:hidden',
              themed
                ? 'border-pg-border text-pg-text hover:bg-pg-text/10'
                : 'border-hairline text-ink hover:bg-surface',
            )}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* collapsed nav menu (< xl) */}
      {menuOpen && (
        <nav
          aria-label="Learn mobile"
          className={clsx(
            'mx-auto mt-3 grid w-full grid-cols-2 gap-1.5 border-t pt-3 sm:grid-cols-3 xl:hidden',
            !fluid && 'max-w-[1440px]',
            themed ? 'border-pg-border' : 'border-hairline',
          )}
        >
          {navItems.map((item) => (
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
