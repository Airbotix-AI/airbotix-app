import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BarChart3, Check, Copy, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useMe, useParentKidLogin } from '@/auth/useAuth';
import { openKidPageInNewTab } from '@/auth/openKidPage';
import { api } from '@/lib/api';
import { KidAvatar } from '@/components/KidAvatar';
import { KidDeviceHandoff } from '@/components/KidDeviceHandoff';
import { KidGrowthTeaser } from './KidGrowthTeaser';

interface Kid {
  id: string;
  nickname: string;
  avatar_id: string | null;
  age: number;
  is_active: boolean;
  daily_star_cap: number | null;
  created_at: string;
  deleted_at: string | null;
}

interface FamilyData {
  id: string;
  name: string;
  code: string;
  region: string;
  primary_email: string;
}

export function FamilyListPage() {
  const nav = useNavigate();
  const me = useMe();
  const parentKidLogin = useParentKidLogin();
  const [openingKidId, setOpeningKidId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const [copiedFamilyCode, setCopiedFamilyCode] = useState(false);
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const family = useQuery<FamilyData>({
    queryKey: ['family', familyId],
    queryFn: () => api<FamilyData>(`/families/${familyId}`),
    enabled: !!familyId,
  });

  const kids = useQuery<Kid[]>({
    queryKey: ['family', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: !!familyId,
  });

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">My family</div>
        <h1 className="section-heading">No family yet</h1>
        <p className="lead-text mt-3">Set up your family first.</p>
        <Link to="/portal/register" className="btn-pill-primary mt-6">
          Start setup →
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row">
        <div className="max-w-2xl">
          <div className="eyebrow eyebrow-bubblegum">My family</div>
          <h1 className="section-heading">{family.data?.name ?? 'Loading…'}</h1>
          <p className="lead-text mt-3">
            Help each child sign in, follow what they’re making, and keep their profile and access
            details up to date.
          </p>
          <p className="mt-2 text-[13px] font-semibold text-slate2">
            {kids.data?.length ?? 0} kid{(kids.data?.length ?? 0) === 1 ? '' : 's'} ·{' '}
            {family.data?.region ?? 'Region loading…'}
          </p>
        </div>
        <Link to="/portal/family/new" className="btn-pill-primary shrink-0 gap-2">
          <Plus size={18} aria-hidden="true" />
          Add another kid
        </Link>
      </header>

      <div className="mb-10 grid items-stretch gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="card-base !bg-wash-sky" aria-labelledby="kid-sign-in-heading">
          <span className="sticker-sky alt">Kid sign-in</span>
          <h2 id="kid-sign-in-heading" className="mt-5 text-[26px] font-bold text-ink">
            Help your child get into Learn
          </h2>
          <p className="mt-2 max-w-xl text-[15px] font-medium leading-relaxed text-ink-soft">
            On the child’s device, open the Airbotix sign-in page. They enter this family code,
            choose their nickname, then type their private PIN.
          </p>

          {family.data && (
            <div className="mt-5 flex flex-col gap-4 rounded-3xl bg-canvas-pure p-5 shadow-card-soft sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-sky">
                  Your family code
                </div>
                <div className="mt-1 font-mono text-[34px] font-extrabold tracking-[0.18em] text-ink sm:text-[40px]">
                  {family.data.code}
                </div>
              </div>
              <button
                type="button"
                className="btn-pill-secondary gap-2"
                onClick={async () => {
                  await navigator.clipboard?.writeText(family.data!.code);
                  setCopiedFamilyCode(true);
                  window.setTimeout(() => setCopiedFamilyCode(false), 1800);
                }}
                aria-label={copiedFamilyCode ? 'Family code copied' : 'Copy family code'}
              >
                {copiedFamilyCode ? <Check size={18} /> : <Copy size={18} />}
                {copiedFamilyCode ? 'Copied' : 'Copy code'}
              </button>
            </div>
          )}

          <ol className="mt-5 grid gap-3 text-[13px] font-medium text-ink-soft sm:grid-cols-3">
            {[
              ['1', 'Enter family code'],
              ['2', 'Choose nickname'],
              ['3', 'Enter private PIN'],
            ].map(([number, label]) => (
              <li key={number} className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-sky text-[12px] font-extrabold text-white">
                  {number}
                </span>
                {label}
              </li>
            ))}
          </ol>
        </section>

        <section className="card-base" aria-labelledby="family-actions-heading">
          <span className="sticker-mint">What can I do here?</span>
          <h2 id="family-actions-heading" className="mt-5 text-[26px] font-bold text-ink">
            Choose the right way to help
          </h2>
          <div className="mt-5 divide-y divide-hairline">
            {[
              {
                emoji: '🚀',
                title: 'Open kids page',
                copy: 'Sign this child in on this device. Learn opens in a new tab and your parent page stays open.',
              },
              {
                emoji: '📱',
                title: 'Another device',
                copy: 'Create a temporary QR code for their tablet or computer. It expires after 5 minutes and works once.',
              },
              {
                emoji: '🌱',
                title: 'Growth report',
                copy: 'See recent creations, active days, favourite studios and progress from the last four weeks.',
              },
              {
                emoji: '🔐',
                title: 'Profile & PIN',
                copy: 'Update their details and limits, manage access, or reset the PIN they use to sign in.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <span className="text-[24px]" aria-hidden="true">
                  {item.emoji}
                </span>
                <div>
                  <h3 className="text-[14px] font-bold text-ink">{item.title}</h3>
                  <p className="mt-0.5 text-[12px] font-medium leading-relaxed text-slate2">
                    {item.copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mb-5">
        <div className="eyebrow eyebrow-coral">Kid profiles</div>
        <h2 className="section-heading text-[28px] sm:text-[32px]">Your kids</h2>
        <p className="mt-2 text-[14px] font-medium text-ink-soft">
          Each card keeps sign-in, growth and profile controls together for that child.
        </p>
      </div>

      {kids.isLoading ? (
        <div className="lead-text">Loading kids…</div>
      ) : kids.data && kids.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {kids.data.map((kid, i) => {
            const palette = [
              { header: 'bg-wash-coral', accent: 'bg-brand-coral' },
              { header: 'bg-wash-sky', accent: 'bg-brand-sky' },
              { header: 'bg-wash-mint', accent: 'bg-brand-mint' },
              { header: 'bg-wash-sunshine', accent: 'bg-brand-sunshine' },
              { header: 'bg-wash-bubblegum', accent: 'bg-brand-bubblegum' },
            ] as const;
            const theme = palette[i % palette.length];
            return (
              <article
                key={kid.id}
                aria-label={`${kid.nickname} profile`}
                className="group overflow-hidden rounded-[28px] border border-hairline bg-canvas-pure text-left shadow-card-soft transition-transform duration-200 hover:-translate-y-0.5"
              >
                <header className={`relative overflow-hidden p-5 sm:p-6 ${theme.header}`}>
                  <span
                    className={`absolute inset-x-0 top-0 h-1.5 ${theme.accent}`}
                    aria-hidden="true"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-4">
                      <KidAvatar
                        avatarId={kid.avatar_id}
                        nickname={kid.nickname}
                        size="lg"
                        className="ring-4 ring-white shadow-md"
                      />
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate2">
                          Child {String(i + 1).padStart(2, '0')}
                        </div>
                        <h3 className="mt-1 truncate text-[27px] font-bold leading-tight text-ink">
                          {kid.nickname}
                        </h3>
                        <div className="mt-1 text-[13px] font-semibold text-ink-soft">
                          Age {kid.age}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-ink shadow-sm">
                      <span
                        className={`h-2 w-2 rounded-full ${kid.is_active ? 'bg-brand-mint' : 'bg-brand-sunshine'}`}
                        aria-hidden="true"
                      />
                      {kid.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </header>

                <div className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate2">
                        Growth snapshot
                      </div>
                      <div className="mt-1 text-[15px] font-bold text-ink">
                        Recent creative activity
                      </div>
                    </div>
                    <BarChart3 size={20} className="shrink-0 text-brand-sky" aria-hidden="true" />
                  </div>
                  <div className="mt-3 rounded-2xl border border-hairline bg-canvas px-4 pb-4 pt-px">
                    <KidGrowthTeaser kidId={kid.id} name={kid.nickname} />
                  </div>
                </div>

                <div className="border-t border-hairline bg-white p-5 pt-4 sm:p-6 sm:pt-5">
                  <p className="mb-3 text-[12px] font-semibold leading-relaxed text-slate2">
                    {kid.is_active
                      ? `Ready for ${kid.nickname} to start creating on this device.`
                      : `${kid.nickname} is paused. Growth and profile details are still available.`}
                  </p>
                  <button
                    type="button"
                    disabled={!kid.is_active || openingKidId !== null}
                    onClick={async () => {
                      setOpeningKidId(kid.id);
                      setOpenError(null);
                      try {
                        // Opens the kid's Learn surface in a NEW tab so this
                        // parent tab stays on My Family (dual session — see
                        // openKidPageInNewTab).
                        await openKidPageInNewTab(parentKidLogin, kid.id, nav);
                        setOpeningKidId(null);
                      } catch {
                        setOpenError(
                          `Could not open ${kid.nickname}'s kids page. Please try again.`,
                        );
                        setOpeningKidId(null);
                      }
                    }}
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3 text-[14px] font-bold text-canvas transition-all duration-200 hover:-translate-y-0.5 hover:bg-ink-soft disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                    aria-label={`Open ${kid.nickname}'s kids page`}
                  >
                    <Sparkles size={17} aria-hidden="true" />
                    {openingKidId === kid.id ? 'Opening…' : `Open ${kid.nickname}'s kids page`}
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Link
                      to={`/portal/family/${kid.id}`}
                      className="inline-flex min-h-12 min-w-0 items-center justify-center rounded-2xl bg-wash-mint px-3 text-center text-[12px] font-bold text-ink transition-colors hover:bg-[#c9efdf]"
                      aria-label={`See ${kid.nickname}'s growth`}
                    >
                      See growth
                    </Link>
                    <div className="[&>button]:min-h-12 [&>button]:w-full [&>button]:!rounded-2xl [&>button]:!border-0 [&>button]:!bg-wash-sky [&>button]:!px-3 [&>button]:!text-[12px] [&>button]:hover:!bg-[#d9ebff]">
                      <KidDeviceHandoff
                        kidId={kid.id}
                        nickname={kid.nickname}
                        avatarId={kid.avatar_id}
                        disabled={!kid.is_active}
                      />
                    </div>
                    <Link
                      to={`/portal/family/${kid.id}/settings`}
                      className="inline-flex min-h-12 min-w-0 items-center justify-center rounded-2xl bg-surface px-3 text-center text-[12px] font-bold text-ink transition-colors hover:bg-surface-soft"
                      aria-label={`Edit ${kid.nickname}'s profile`}
                    >
                      Profile &amp; PIN
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="card-base text-center">
          <div className="mb-3">
            <span className="sticker-mint">Empty</span>
          </div>
          <h2 className="section-heading mt-4" style={{ fontSize: '24px' }}>
            No kids yet
          </h2>
          <p className="lead-text mt-2">Add your first kid to get them signed in.</p>
          <Link to="/portal/family/new" className="btn-pill-primary mt-6">
            + Add kid
          </Link>
        </div>
      )}

      {openError && (
        <p
          className="mt-5 rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-semibold text-ink"
          role="alert"
        >
          {openError}
        </p>
      )}

      <aside className="mt-8 rounded-3xl border border-brand-sunshine/40 bg-wash-sunshine px-5 py-4 text-[13px] font-medium leading-relaxed text-ink-soft">
        <span className="font-bold text-ink">Good to know:</span> a paused child stays visible so
        you can review their growth or update their profile, but a new kids-page session cannot be
        opened until their access is active again.
      </aside>
    </div>
  );
}
