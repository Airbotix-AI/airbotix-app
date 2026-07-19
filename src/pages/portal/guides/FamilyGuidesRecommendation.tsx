import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { api } from '@/lib/api';
import { GuideCard } from './GuideCard';
import { selectRecommendedGuides, type ResourceGuidesResponse } from './resourceGuides';

// Same query keys + endpoints the family pages use (['family', id] matches
// SettingsPage, ['family', id, 'kids'] matches the onboarding checklist), so
// the queries dedupe with anything already cached.
interface KidWithAge {
  id: string;
  age?: number | null;
}

interface FamilyWithLocation {
  id: string;
  city?: string | null;
  state?: string | null;
}

/**
 * Dashboard "Family Guides" recommendation block (parent-portal-family-guides-prd
 * §5.2): 2–3 recommended guides + "View all" to /portal/guides. Phase 1 rule is
 * the pure frontend selector `selectRecommendedGuides` — featured guides matching
 * the family's known city/state (from the family profile query) and the kids'
 * ages first, then remaining featured, then newest. Renders nothing while
 * loading, on error, or when the catalogue is empty so the Dashboard never
 * breaks over guides.
 */
export function FamilyGuidesRecommendation({ familyId }: { familyId: string | null }) {
  const guides = useQuery<ResourceGuidesResponse>({
    queryKey: ['resource-guides'],
    queryFn: () => api<ResourceGuidesResponse>('/portal/resource-guides'),
  });
  const family = useQuery<FamilyWithLocation>({
    queryKey: ['family', familyId],
    queryFn: () => api<FamilyWithLocation>(`/families/${familyId}`),
    enabled: familyId !== null,
  });
  const kids = useQuery<KidWithAge[]>({
    queryKey: ['family', familyId, 'kids'],
    queryFn: () => api<KidWithAge[]>(`/families/${familyId}/kids`),
    enabled: familyId !== null,
  });

  const items = guides.data?.items ?? [];
  if (guides.isLoading || guides.isError || items.length === 0) return null;

  const kidAges = (kids.data ?? [])
    .map((kid) => kid.age)
    .filter((age): age is number => typeof age === 'number');
  const recommended = selectRecommendedGuides(items, kidAges, {
    city: family.data?.city ?? null,
    state: family.data?.state ?? null,
  });

  return (
    <section className="mt-10" aria-label="Family Guides">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-mint">Family Guides</div>
          <h2 className="text-[22px] font-bold text-ink">Picked for your family</h2>
        </div>
        <Link to="/portal/guides" className="btn-pill-secondary shrink-0">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {recommended.map((item) => (
          <GuideCard key={item.slug} item={item} compact />
        ))}
      </div>
    </section>
  );
}
