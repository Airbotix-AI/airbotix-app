import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { CreatorPassportView } from '@/features/creator-passport/CreatorPassportView';
import { fetchCreatorPassport } from '@/features/creator-passport/creatorPassport';

export function KidCreatorPassportPage() {
  const { kidId } = useParams<{ kidId: string }>();
  const passport = useQuery({
    queryKey: ['creator-passport', kidId],
    queryFn: () => fetchCreatorPassport(kidId as string),
    enabled: !!kidId,
  });

  if (passport.isLoading) return <p className="lead-text">Loading Creator Passport…</p>;
  if (passport.isError || !passport.data) {
    return <p className="lead-text">We could not load this Creator Passport. Please try again.</p>;
  }

  return (
    <div className="space-y-6">
      <Link to={`/portal/family/${kidId}`} className="btn-pill-ghost inline-flex">
        ← Back to growth
      </Link>
      <CreatorPassportView
        passport={passport.data}
        projectHref={(projectId) => `/portal/audit/project/${projectId}`}
      />
    </div>
  );
}
