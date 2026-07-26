import { useQuery } from '@tanstack/react-query';
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
        <Link to="/portal/register" className="btn-pill-primary mt-6">Start setup →</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-sky">My family</div>
          <h1 className="section-heading">{family.data?.name ?? 'Loading…'}</h1>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            {kids.data?.length ?? 0} kid{(kids.data?.length ?? 0) === 1 ? '' : 's'} ·{' '}
            {family.data?.region ?? '—'}
          </p>
        </div>
        <Link to="/portal/family/new" className="btn-pill-primary">+ Add kid</Link>
      </div>

      {kids.isLoading ? (
        <div className="lead-text">Loading kids…</div>
      ) : kids.data && kids.data.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {kids.data.map((kid, i) => {
            const palette = ['coral', 'bubblegum', 'sunshine', 'sky', 'mint'] as const;
            const color = palette[i % palette.length];
            return (
              <div
                key={kid.id}
                className={`stat-tile ${color} block text-left transition-transform hover:-translate-y-0.5`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <KidAvatar avatarId={kid.avatar_id} nickname={kid.nickname} size="lg" />
                    <div>
                    <div className="text-[28px] font-bold text-ink leading-tight">{kid.nickname}</div>
                    <div className="text-[13px] text-slate2 mt-1">Age {kid.age}</div>
                    </div>
                  </div>
                  <span className={`sticker-${color}`}>{kid.is_active ? 'Active' : 'Paused'}</span>
                </div>

                <KidGrowthTeaser kidId={kid.id} name={kid.nickname} />

                <div className="mt-5 flex flex-wrap gap-2">
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
                        setOpenError(`Could not open ${kid.nickname}'s kids page. Please try again.`);
                        setOpeningKidId(null);
                      }
                    }}
                    className="btn-pill-primary"
                    aria-label={`Open ${kid.nickname}'s kids page`}
                  >
                    {openingKidId === kid.id ? 'Opening…' : 'Open kids page →'}
                  </button>
                  <Link
                    to={`/portal/family/${kid.id}`}
                    className="btn-pill-secondary"
                    aria-label={`See ${kid.nickname}'s growth`}
                  >
                    See growth
                  </Link>
                  <KidDeviceHandoff
                    kidId={kid.id}
                    nickname={kid.nickname}
                    avatarId={kid.avatar_id}
                    disabled={!kid.is_active}
                  />
                  <Link
                    to={`/portal/family/${kid.id}/settings`}
                    className="btn-pill-primary"
                    aria-label={`Edit ${kid.nickname}'s profile`}
                  >
                    Edit profile
                  </Link>
                </div>
              </div>
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
          <Link to="/portal/family/new" className="btn-pill-primary mt-6">+ Add kid</Link>
        </div>
      )}

      {openError && <p className="field-error mt-4" role="alert">{openError}</p>}

      {family.data && (
        <div className="card-base mt-8 flex items-center justify-between gap-6">
          <div>
            <div className="eyebrow eyebrow-mint">Family code</div>
            <div
              className="font-mono font-extrabold text-ink mt-1"
              style={{ fontSize: '40px', letterSpacing: '0.2em' }}
            >
              {family.data.code}
            </div>
            <p className="text-[13px] text-slate2 mt-2">
              Kids type this code, their nickname, and PIN to sign in.
            </p>
          </div>
          <button
            onClick={() => navigator.clipboard?.writeText(family.data!.code)}
            className="btn-pill-secondary"
          >
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
