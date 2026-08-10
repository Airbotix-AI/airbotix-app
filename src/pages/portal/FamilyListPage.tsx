import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Plus } from 'lucide-react';
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
            const palette = ['coral', 'bubblegum', 'sunshine', 'sky', 'mint'] as const;
            const color = palette[i % palette.length];
            return (
              <article key={kid.id} className={`stat-tile ${color} block !p-5 text-left sm:!p-6`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <KidAvatar avatarId={kid.avatar_id} nickname={kid.nickname} size="lg" />
                    <div className="min-w-0">
                      <h3 className="truncate text-[26px] font-bold leading-tight text-ink">
                        {kid.nickname}
                      </h3>
                      <div className="mt-1 text-[13px] font-medium text-slate2">Age {kid.age}</div>
                    </div>
                  </div>
                  <span className={`sticker-${kid.is_active ? 'mint' : 'sunshine'} shrink-0`}>
                    {kid.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="mt-5 rounded-2xl bg-surface px-4 pb-3 pt-px">
                  <KidGrowthTeaser kidId={kid.id} name={kid.nickname} />
                </div>

                <div className="mt-5">
                  <p className="mb-2 text-[12px] font-semibold text-slate2">
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
                    className="btn-pill-primary w-full"
                    aria-label={`Open ${kid.nickname}'s kids page`}
                  >
                    {openingKidId === kid.id ? 'Opening…' : `Open ${kid.nickname}'s kids page →`}
                  </button>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <Link
                      to={`/portal/family/${kid.id}`}
                      className="btn-pill-secondary min-w-0 !px-3 text-[13px]"
                      aria-label={`See ${kid.nickname}'s growth`}
                    >
                      Growth report
                    </Link>
                    <div className="[&>button]:w-full [&>button]:!px-3 [&>button]:text-[13px]">
                      <KidDeviceHandoff
                        kidId={kid.id}
                        nickname={kid.nickname}
                        avatarId={kid.avatar_id}
                        disabled={!kid.is_active}
                      />
                    </div>
                    <Link
                      to={`/portal/family/${kid.id}/settings`}
                      className="btn-pill-secondary min-w-0 !px-3 text-[13px]"
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
