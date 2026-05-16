import { useParams } from 'react-router-dom';

import { PagePlaceholder } from '@/components/PagePlaceholder';

export function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PagePlaceholder
      title={`Mission ${id ?? ''}`}
      prdRef="airbotix-app-learn-prd.md §6"
      description="Step list, acceptance criteria, start-project CTA."
    />
  );
}
