import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { openKidPageInNewTab } from '@/auth/openKidPage';
import { useParentKidLogin } from '@/auth/useAuth';
import { KidAvatar } from '@/components/KidAvatar';
import { api } from '@/lib/api';
import { KidGrowthTeaser } from './KidGrowthTeaser';

interface DashboardKid {
  id: string;
  nickname: string;
  avatar_id: string | null;
  age: number;
  is_active: boolean;
}

interface OpenError {
  kidId: string;
  message: string;
}

export function DashboardKidsPanel({ familyId }: { familyId: string }) {
  const parentKidLogin = useParentKidLogin();
  const [openingKidId, setOpeningKidId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<OpenError | null>(null);
  const kids = useQuery<DashboardKid[]>({
    queryKey: ['family', familyId, 'kids'],
    queryFn: () => api<DashboardKid[]>(`/families/${familyId}/kids`),
    retry: false,
  });

  const openKidsPage = async (kid: DashboardKid) => {
    if (!kid.is_active || openingKidId !== null) return;
    setOpeningKidId(kid.id);
    setOpenError(null);
    try {
      await openKidPageInNewTab(parentKidLogin, kid.id, () => {
        throw new Error('Kid tab was blocked');
      });
    } catch {
      setOpenError({
        kidId: kid.id,
        message: `Could not open ${kid.nickname}'s kids page. Allow pop-ups and try again.`,
      });
    } finally {
      setOpeningKidId(null);
    }
  };

  return (
    <section aria-labelledby="dashboard-kids-heading" data-testid="dashboard-kids">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 sm:mb-3">
        <h2 id="dashboard-kids-heading" className="section-heading text-[28px] sm:text-[32px]">
          My kids
        </h2>
        <Link
          to="/portal/family"
          className="inline-flex min-h-11 items-center text-[13px] font-bold text-brand-coral hover:underline"
        >
          Manage all →
        </Link>
      </div>

      {kids.isLoading ? (
        <div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 min-[900px]:grid-cols-3"
          aria-live="polite"
        >
          <span className="sr-only">Loading your kids…</span>
          {[0, 1, 2].map((slot) => (
            <div
              key={slot}
              className="min-h-36 animate-pulse rounded-[20px] bg-white p-3 shadow-sm sm:min-h-44 sm:rounded-[24px] sm:p-4"
              aria-hidden="true"
            >
              <div className="h-14 w-14 rounded-full bg-ink/10" />
              <div className="mt-3 h-4 w-2/5 rounded-full bg-ink/10" />
              <div className="mt-2 h-3 w-3/5 rounded-full bg-ink/10" />
            </div>
          ))}
        </div>
      ) : kids.isError ? (
        <div className="card-base">
          <h3 className="text-[20px] font-bold text-ink">We couldn&apos;t load your kids</h3>
          <p className="mt-2 text-[14px] text-ink-soft">
            Your other Dashboard tools are still available. Try again or open My Family.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" onClick={() => void kids.refetch()} className="btn-pill-primary">
              Retry
            </button>
            <Link to="/portal/family" className="btn-pill-secondary">
              Open My Family
            </Link>
          </div>
        </div>
      ) : kids.data?.length === 0 ? (
        <div className="card-base">
          <div className="text-[38px] leading-none" aria-hidden="true">
            🌱
          </div>
          <h3 className="mt-3 text-[22px] font-bold text-ink">Add your first kid</h3>
          <p className="mt-2 text-[14px] text-ink-soft">
            Create their profile so they can sign in and start making.
          </p>
          <Link to="/portal/family/new" className="btn-pill-primary mt-5">
            Add your first kid →
          </Link>
        </div>
      ) : (
        <div
          data-testid="dashboard-kids-grid"
          className={
            kids.data?.length === 1
              ? 'grid max-w-md grid-cols-1 gap-3'
              : 'grid grid-cols-1 gap-3 sm:grid-cols-2 min-[900px]:grid-cols-3'
          }
        >
          {kids.data?.map((kid) => {
            const isOpening = openingKidId === kid.id;
            const error = openError?.kidId === kid.id ? openError.message : null;
            return (
              <article
                key={kid.id}
                className="dashboard-kid-card rounded-[20px] border border-ink/5 bg-white p-3 shadow-[0_8px_24px_rgba(42,35,58,0.06)] sm:rounded-[24px] sm:p-4 sm:shadow-[0_10px_30px_rgba(42,35,58,0.06)]"
                data-testid="dashboard-kid-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <KidAvatar
                      avatarId={kid.avatar_id}
                      nickname={kid.nickname}
                      size="md"
                      className="!h-11 !w-11 sm:!h-14 sm:!w-14"
                    />
                    <div className="min-w-0">
                      <h3 className="truncate text-[18px] font-bold leading-tight text-ink sm:text-[21px]">
                        {kid.nickname}
                      </h3>
                      <p className="text-[11px] text-slate2 sm:mt-0.5 sm:text-[12px]">
                        Age {kid.age}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`sticker-${kid.is_active ? 'mint' : 'sunshine'} !px-2 !py-1 !text-[9px] sm:!text-[10px]`}
                  >
                    {kid.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="[&>*]:!mt-2 sm:[&>*]:!mt-3">
                  <KidGrowthTeaser kidId={kid.id} name={kid.nickname} compact />
                </div>

                <div className="mt-2 flex items-center gap-2 sm:mt-4 sm:grid sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!kid.is_active || openingKidId !== null}
                    onClick={() => void openKidsPage(kid)}
                    className="btn-pill-primary !min-h-11 !w-auto !px-4 !py-2 !text-[12px] sm:!w-full sm:!px-3 sm:!text-[13px]"
                    aria-label={`Open ${kid.nickname}'s kids page`}
                  >
                    {isOpening ? (
                      'Opening…'
                    ) : (
                      <>
                        <span className="sm:hidden">Open</span>
                        <span className="hidden sm:inline">Open page</span>
                      </>
                    )}
                  </button>
                  <Link
                    to={`/portal/family/${kid.id}`}
                    className="btn-pill-secondary !min-h-11 !w-auto !border-0 !bg-transparent !px-3 !py-2 !text-[13px] text-ink-soft hover:!bg-surface hover:!text-ink sm:!w-full sm:!border-2 sm:!border-ink sm:!px-3 sm:text-ink"
                    aria-label={`See ${kid.nickname}'s growth`}
                  >
                    Growth
                  </Link>
                </div>

                {!kid.is_active && (
                  <p className="mt-2 text-[11px] font-semibold text-slate2">
                    Paused — manage in My Family.
                  </p>
                )}
                {error && (
                  <p className="field-error mt-2 text-[11px]" role="alert">
                    {error}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
