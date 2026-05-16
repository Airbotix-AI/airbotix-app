import { useParams } from 'react-router-dom';

import { PagePlaceholder } from '@/components/PagePlaceholder';

export function FamilyDetailPage() {
  const { kidId } = useParams<{ kidId: string }>();
  return (
    <PagePlaceholder
      title={`Kid ${kidId ?? ''}`}
      prdRef="parent-portal-prd.md §4.3"
      description="Single-kid: login info, Stars + limits, topic limits, recent activity, danger zone."
    />
  );
}
