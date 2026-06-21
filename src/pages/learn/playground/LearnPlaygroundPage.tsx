import { useParams } from 'react-router-dom';

import { PlaygroundApp } from './PlaygroundApp';

/**
 * Authed kid-surface entry to the Phaser game studio: `/learn/playground/:projectId`.
 * A `/learn` child, so it KEEPS the Learn top nav (LearnLayout) and renders
 * full-bleed below it (via FLUID_ROUTES); the studio fills the area with `h-full`.
 * This authed route is the only entry; dev/e2e testing uses a route-mocked authed
 * harness (`e2e/helpers.ts`) against `/learn/playground/new` + `/learn/create/code`.
 *
 * The Game Playground card now creates a REAL `kind='game'` backend project (PRD J1)
 * and routes here with its id; the studio loads that project's seeded Phaser VFS
 * (`GET /projects/:id/code/files`). If the backend `game` kind isn't ready, create
 * falls back to a `local-<uuid>` id whose file load 404s → the local scaffold
 * (IndexedDB-cached, keyed by `projectId`).
 */
export function LearnPlaygroundPage() {
  const { projectId } = useParams<{ projectId: string }>();
  return <PlaygroundApp projectId={projectId} />;
}
