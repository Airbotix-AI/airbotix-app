// The bundled, public snapshot the /play/try-demo-blocks page renders
// (try-demo-mode-prd D-DEMO-09 — the blocks demo's "see what a friend sees"
// beat). PARITY: the recipient view is the REAL `PublicPlayPage`, which detects
// a blocks project by its `project.blocks.json` file and renders the real
// `ReadOnlyBlocksPlayer`. We reuse the demo's OWN bundled "Cat's Day Out" story,
// serialized through the real model — genuine product content, zero network,
// build-time constant (D-DEMO-02 intact).

import type { VfsFile } from '../learn/code/codeApi';
import { BLOCKS_PROJECT_FILE, serializeProject } from '../learn/blocks/blocksModel';
import { CATS_DAY_OUT } from './demoStory.blocks';

/** The frozen story the public blocks demo play page renders. */
export function demoBlocksSnapshot(): VfsFile[] {
  const content = serializeProject(CATS_DAY_OUT);
  return [{ path: BLOCKS_PROJECT_FILE, content, kind: 'text', size: content.length }];
}
