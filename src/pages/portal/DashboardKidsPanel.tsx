import { useQuery } from '@tanstack/react-query';
import { KidAvatar } from '@/components/KidAvatar';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { openKidPageInNewTab } from '@/auth/openKidPage';
import { useParentKidLogin } from '@/auth/useAuth';
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
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-bubblegum">Your family</div>
          <h2 id="dashboard-kids-heading" className="section-heading text-[30px] sm:text-[36px]">
            My kids
          </h2>
          <p className="mt-1 text-[13px] font-medium text-ink-soft sm:text-[14px]">
            Open Learn or check recent growth for each child.
          </p>
        </div>
        <Link to="/portal/family" className="btn-pill-ghost shrink-0">
          Manage <span aria-hidden="true">→</span>
        </Link>
      </div>

      {kids.isLoading ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-live="polite">
          <span className="sr-only">Loading your kids…</span>
          {[0, 1].map((slot) => (
            <div key={slot} className="card-base min-h-48 animate-pulse" aria-hidden="true">
              <div className="h-14 w-14 rounded-full bg-ink/10" />
              <div className="mt-4 h-5 w-2/5 rounded-full bg-ink/10" />
              <div className="mt-3 h-4 w-3/5 rounded-full bg-ink/10" />
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
              ? 'grid max-w-lg grid-cols-1 gap-3'
              : kids.data?.length === 2
                ? 'grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2'
                : 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
          }
        >
          {kids.data?.map((kid) => {
            const isOpening = openingKidId === kid.id;
            const error = openError?.kidId === kid.id ? openError.message : null;
            return (
              <article
                key={kid.id}
                className="card-base flex min-h-[196px] flex-col border border-ink/5 !p-4 sm:!p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <KidAvatar avatarId={kid.avatar_id} nickname={kid.nickname} size="md" />
                    <div className="min-w-0">
                      <h3 className="truncate text-[22px] font-bold leading-tight text-ink">
                        {kid.nickname}
                      </h3>
                      <p className="mt-0.5 text-[12px] font-medium text-slate2">Age {kid.age}</p>
                    </div>
                  </div>
                  <span
                    className={`sticker-${kid.is_active ? 'mint' : 'sunshine'} !px-3 !py-1 text-[9px]`}
                  >
                    {kid.is_active ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="min-h-8">
                  <KidGrowthTeaser kidId={kid.id} name={kid.nickname} compact />
                </div>

                <div className="mt-auto flex gap-2 pt-4">
                  <button
                    type="button"
                    disabled={!kid.is_active || openingKidId !== null}
                    onClick={() => void openKidsPage(kid)}
                    className="btn-pill-primary min-w-0 flex-1 !px-3 text-[13px]"
                    aria-label={`Open ${kid.nickname}'s kids page`}
                  >
                    {isOpening ? 'Opening…' : 'Open Learn'}
                  </button>
                  <Link
                    to={`/portal/family/${kid.id}`}
                    className="btn-pill-secondary min-w-0 flex-1 !px-3 text-[13px]"
                    aria-label={`See ${kid.nickname}'s growth`}
                  >
                    Growth
                  </Link>
                </div>

                {!kid.is_active && (
                  <p className="mt-3 text-[12px] font-semibold text-slate2">
                    Paused — update this kid in My Family.
                  </p>
                )}
                {error && (
                  <p className="field-error mt-3" role="alert">
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
