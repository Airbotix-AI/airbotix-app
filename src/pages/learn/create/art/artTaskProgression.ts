import type { Artifact } from '../shared/useStudio';
import type { ArtTaskListItem } from './artTaskTypes';

interface ArtTaskArtifactMetadata {
  art_task_slug?: unknown;
  completed_steps?: unknown;
}

export function completedTaskSlugs(
  artifacts: Artifact[],
  tasksBySlug: ReadonlyMap<string, ArtTaskListItem>,
): Set<string> {
  const completed = new Set<string>();

  for (const artifact of artifacts) {
    const metadata = artifact.metadata as ArtTaskArtifactMetadata;
    if (typeof metadata.art_task_slug !== 'string') continue;
    const task = tasksBySlug.get(metadata.art_task_slug);
    if (!task || typeof metadata.completed_steps !== 'number') continue;
    if (metadata.completed_steps >= task.step_count) completed.add(task.slug);
  }

  return completed;
}

/**
 * Continue from the newest completed drawing and return one next unfinished task.
 * Already-finished tasks in the same path are skipped, so the child never receives
 * a wall of recommendations or gets sent backwards.
 */
export function nextDrawingTask(
  tasks: ArtTaskListItem[],
  artifacts: Artifact[],
): ArtTaskListItem | null {
  const tasksBySlug = new Map(tasks.map((task) => [task.slug, task]));
  const completed = completedTaskSlugs(artifacts, tasksBySlug);
  const newestCompletedSlug = artifacts.find((artifact) => {
    const metadata = artifact.metadata as ArtTaskArtifactMetadata;
    return typeof metadata.art_task_slug === 'string' && completed.has(metadata.art_task_slug);
  })?.metadata as ArtTaskArtifactMetadata | undefined;

  if (typeof newestCompletedSlug?.art_task_slug !== 'string') return null;

  let current = tasksBySlug.get(newestCompletedSlug.art_task_slug) ?? null;
  const visited = new Set<string>();
  while (current?.progression?.next_task_slug) {
    if (visited.has(current.slug)) return null;
    visited.add(current.slug);
    const next = tasksBySlug.get(current.progression.next_task_slug) ?? null;
    if (!next) return null;
    if (!completed.has(next.slug)) return next;
    current = next;
  }

  return null;
}
