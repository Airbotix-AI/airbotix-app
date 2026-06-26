import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { useDemoMode } from '@/pages/try/demoMode';

/**
 * Where "back" from a project should go. A project made for a class returns to
 * that class's "My work" tab (my-classes-prd §3.4) — not the global Projects tab.
 * Personal projects fall back to /learn/projects.
 */
export function projectBackTo(
  classId: string | null | undefined,
  fallback = '/learn/projects',
): string {
  return classId ? `/learn/classroom/${classId}?tab=mywork` : fallback;
}

/**
 * Hook variant for studios that only hold the project id (Blocks/Code) — fetches
 * the project's class_id (cached) so the Home/back button is class-aware.
 */
export function useProjectBackTo(projectId: string | undefined, fallback = '/learn/projects'): string {
  // The /try/* demo is network-isolated (try-demo-mode-prd D-DEMO-02): never hit
  // `GET /projects/:id` for the back-link's class_id. The demo has no class and
  // overrides Home itself, so the fallback is correct — and the fetch would break
  // the "zero network" contract (it hit the real backend, e.g. TryBlocksPage).
  const demo = useDemoMode();
  const { data } = useQuery<{ class_id: string | null }>({
    queryKey: ['project-back', projectId],
    queryFn: () => api<{ class_id: string | null }>(`/projects/${projectId}`),
    enabled: !!projectId && !demo,
    staleTime: 60_000,
  });
  return projectBackTo(data?.class_id, fallback);
}
