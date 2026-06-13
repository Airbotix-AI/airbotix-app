// The bundled, public snapshot the /play/try-demo-playground page renders
// (try-demo-mode-prd D-DEMO-09 — the demo's "see what a friend sees" beat).
//
// PARITY: the recipient view is the REAL, unmodified `PublicPlayPage`; this only
// supplies the VFS it plays. We reuse the demo's OWN starter game — a real,
// tested, playable fruit-catcher — so the shared content is genuine product
// content, never an invented demo facsimile. It is a build-time constant (not
// session state), resolved offline by `readPublicSnapshot` so a real new tab
// works with zero network (D-DEMO-02 intact: no demo project/session persisted).

import type { VfsFile } from '../learn/code/codeApi';
import { demoStarterFiles } from './demoStarter.playground';

/** The frozen game the public demo play page renders (fresh copy each call). */
export function demoGameSnapshot(): VfsFile[] {
  return demoStarterFiles();
}
