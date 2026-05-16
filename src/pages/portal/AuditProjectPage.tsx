import { useParams } from 'react-router-dom';

import { PagePlaceholder } from '@/components/PagePlaceholder';

export function AuditProjectPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PagePlaceholder
      title={`Project replay ${id ?? ''}`}
      prdRef="parent-portal-prd.md §4.6"
      description="Replay a single project: every agent action, tool call, Stars spend, in order."
    />
  );
}
