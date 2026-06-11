// PUBLIC, no-auth Blocks Studio demo — `/try/blocks` (try-demo-mode-prd §4 T2).
// Renders the REAL `BlocksStudioPage` (unmodified) with a fixed demo project id;
// the blocksApi demo adapter serves the bundled "Cat's Day Out" story through the
// real parser and turns saves into in-memory no-ops. The tour overlay floats on
// top and only instructs — every interaction (▶ Go, taps, number tiles, drags,
// pages) is the real editor. No AI gate needed: Blocks Studio has no AI today.

import { useEffect, useMemo, useState } from 'react';

import { BlocksStudioPage } from '../learn/blocks/BlocksStudioPage';
import { DemoBanner } from './DemoBanner';
import { DemoModeProvider, type DemoMode } from './demoMode';
import { DemoTourOverlay, type DemoTourStep } from './DemoTourOverlay';
import { TRY_BLOCKS_PROJECT_ID, installBlocksDemo, uninstallBlocksDemo } from './demoAdapters';

// Tour cards (D-DEMO-05; copy follows the PRD mockup — adult-facing). The cards
// instruct; the user drives the real studio between them.
const TOUR: DemoTourStep[] = [
  {
    title: 'A whole story, already built',
    body:
      "This 3-page animated story — Cat's Day Out — is written entirely in snap-together " +
      'blocks, in the real Blocks Studio children aged 5–8 use in class. Nothing here is a ' +
      'mock-up.',
    nextLabel: '▶ Start the tour',
    modal: true,
  },
  {
    title: 'Press ▶ Go!',
    body:
      'Tap the green Go button (top right) and watch page 1 play: the cat reads its track — ' +
      'start, say, move, hop — and sends a message that wakes the butterfly. Each colour is a ' +
      'meaning: yellow starts, blue moves, purple talks.',
  },
  {
    title: 'Tap a character',
    body:
      "Everything is touch-first. Tap the cat on the stage to run its 👆 'on tap' script — and " +
      'tap the sun to see a single block turn the page.',
  },
  {
    title: "Change a number — now it's theirs",
    body:
      'Tap any block in the track below to edit it: number tiles open a +/− stepper, blocks ' +
      'drag between tracks or to the bin, and the palette adds new ones. Undo is always one ' +
      'tap away.',
  },
  {
    title: 'Stories turn the page by themselves',
    body:
      "Use the page thumbnails on the right to visit pages 2 and 3 — the sun and the boat jump " +
      "pages with a 'go to page' block, like a picture book the child programs.",
  },
  {
    title: "Now it's all yours",
    body:
      'Explore freely — every block, character, scene, sound and page is the real product. ' +
      'Nothing is saved and nothing can break: reload and the demo starts fresh. Like what you ' +
      'see? Book a chat from the banner above.',
    nextLabel: 'Finish & explore freely ✨',
  },
];

export function TryBlocksPage() {
  // Seams armed (the studio must not mount before the adapter is installed —
  // its load effect would otherwise hit the real backend).
  const [armed, setArmed] = useState(false);
  const [view, setView] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    installBlocksDemo();
    setArmed(true);
    return uninstallBlocksDemo;
  }, []);

  const demoValue = useMemo<DemoMode>(() => ({ surface: 'blocks' }), []);

  return (
    <DemoModeProvider value={demoValue}>
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <DemoBanner />
        {/* `.bsx-demo-host` makes the studio fill this host instead of 100dvh
            (one scoped rule in blocks.css) — no other styling is touched. */}
        <div className="bsx-demo-host relative min-h-0 flex-1">
          {armed && <BlocksStudioPage projectId={TRY_BLOCKS_PROJECT_ID} />}
        </div>
        {!done && (
          <DemoTourOverlay
            steps={TOUR}
            step={view}
            onNext={() => (view >= TOUR.length - 1 ? setDone(true) : setView(view + 1))}
            onBack={() => setView((v) => Math.max(0, v - 1))}
            onSkip={() => setDone(true)}
          />
        )}
      </div>
    </DemoModeProvider>
  );
}
