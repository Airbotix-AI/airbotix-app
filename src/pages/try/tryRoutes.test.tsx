// @vitest-environment jsdom
// Route accessibility (try-demo-mode-prd D-DEMO-01 / acceptance 1): the /try/*
// demos are mounted at the TOP LEVEL of the router — like /play/:shareId —
// never nested under a <ProtectedRoute>, so a clean browser session reaches
// them with zero auth redirects.

import { matchRoutes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { router } from '@/app/router';
import { TryBlocksPage } from './TryBlocksPage';
import { TryPlaygroundPage } from './TryPlaygroundPage';

describe('public /try routes', () => {
  it.each([
    ['/try/playground', TryPlaygroundPage],
    ['/try/blocks', TryBlocksPage],
  ])('%s matches a single top-level public route', (path, component) => {
    const matches = matchRoutes(router.routes, path);
    expect(matches).not.toBeNull();
    // A top-level route: exactly one match, no guard/layout wrapper in the chain.
    expect(matches).toHaveLength(1);
    const route = matches![0].route as { element?: React.ReactElement };
    expect(route.element?.type).toBe(component);
  });
});
