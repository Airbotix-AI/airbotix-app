import { useParams } from 'react-router-dom';

import { PlaygroundApp } from './PlaygroundApp';

/**
 * Authed kid-surface entry to the Phaser game studio: `/learn/playground/:projectId`.
 * A `/learn` child, so it KEEPS the Learn top nav (LearnLayout) and renders
 * full-bleed below it (via FLUID_ROUTES); the studio fills the area with `h-full`.
 * The DEV `/playground-sandbox` is the no-auth, truly full-screen quick-test entry.
 *
 * Phase 1 (frontend-only): the backend has no `game` project kind yet, so the
 * playground's file load 404s for these ids and falls back to the local Phaser
 * scaffold, persisting to IndexedDB keyed by `projectId`. Phase 2 makes it a real
 * server-backed game project. The Tiny Game card routes here with a `local-<uuid>`.
 */
export function LearnPlaygroundPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <PlaygroundApp projectId={projectId} />;
}
