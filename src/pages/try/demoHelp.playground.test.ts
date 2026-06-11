// The bundled Game Guide corpus (try-demo-mode-prd §3 step 10): must satisfy the
// REAL HelpPane's expectations — the default doc exists, every doc belongs to a
// listed pillar, and the pane's client-side search finds it.

import { describe, expect, it } from 'vitest';

import { searchDocs } from '../learn/playground/panes/help/helpApi';
import { DEMO_HELP_CORPUS } from './demoHelp.playground';

describe('DEMO_HELP_CORPUS', () => {
  it("contains the pane's default doc and well-formed pillars", () => {
    expect(DEMO_HELP_CORPUS.docs.map((d) => d.id)).toContain('engine/what-is-an-engine');
    const pillarIds = new Set(DEMO_HELP_CORPUS.pillars.map((p) => p.id));
    for (const doc of DEMO_HELP_CORPUS.docs) {
      expect(pillarIds.has(doc.pillar), `${doc.id} → unknown pillar ${doc.pillar}`).toBe(true);
      expect(doc.blocks.length).toBeGreaterThan(0);
    }
  });

  it('is searchable through the real pane search (both tiers)', () => {
    expect(searchDocs(DEMO_HELP_CORPUS.docs, 'score', 'lite').length).toBeGreaterThan(0);
    expect(searchDocs(DEMO_HELP_CORPUS.docs, 'how do I move?', 'pro').length).toBeGreaterThan(0);
  });
});
