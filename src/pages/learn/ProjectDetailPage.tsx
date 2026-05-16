import { useParams } from 'react-router-dom';

import { PagePlaceholder } from '@/components/PagePlaceholder';

// Editor surface for a single project. Canvas + chat + artifact panel + Stars meter.
// Per airbotix-app-learn-prd.md the kid sees: prompts they sent, generated artifacts,
// step-by-step mission guidance, "ask for more Stars" trigger.
export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PagePlaceholder
      title={`Project ${id ?? ''}`}
      prdRef="airbotix-app-learn-prd.md §5 + §6"
      description="Editor: prompt/chat pane, artifact gallery, Stars meter, step guidance, request more Stars."
    />
  );
}
