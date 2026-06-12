// PUBLIC, no-auth Blocks Studio demo — `/try/blocks` (try-demo-mode-prd §4 T2).
// Renders the REAL `BlocksStudioPage` (unmodified) with a fixed demo project id;
// the blocksApi demo adapter serves the bundled "Cat's Day Out" story through the
// real parser and turns saves into in-memory no-ops. The tour overlay floats on
// top and only instructs — every interaction (▶ Go, taps, number tiles, drags,
// pages) is the real editor. No AI gate needed: Blocks Studio has no AI today.

import { useEffect, useMemo, useRef, useState } from 'react';

import { BlocksStudioPage } from '../learn/blocks/BlocksStudioPage';
import { useBlocksTheme } from '../learn/blocks/blocksTheme';
import { DemoBanner } from './DemoBanner';
import { DEMO_EXIT_URL, DemoModeProvider, type DemoMode } from './demoMode';
import { DemoTourOverlay, type DemoTourStep } from './DemoTourOverlay';
import { TRY_BLOCKS_PROJECT_ID, installBlocksDemo, uninstallBlocksDemo } from './demoAdapters';

// Tour cards (D-DEMO-05; copy follows the PRD mockup — adult-facing). The cards
// instruct; the user drives the real studio between them.
const TOUR: DemoTourStep[] = [
  {
    title: "Cat's Day Out — a story told in blocks",
    body:
      'A 3-page animated story, built from snap-together blocks — how children aged 5–8 ' +
      "learn to code. Let's play it, then change it.",
    nextLabel: '▶ Start the tour',
    modal: true,
  },
  {
    title: 'Press ▶ Go!',
    body:
      'Tap the green Go button (top right) — or let me — and watch the cat follow its blocks: ' +
      'start, move, say, hop. Each colour means one thing: yellow starts, blue moves, purple talks.',
    spotlight: '[data-testid="go-button"]',
    nextLabel: '▶ Press Go!',
  },
  {
    title: 'Tap a character',
    body:
      "Tap the cat on the stage to run its 👆 'on tap' blocks. Then tap the sun — one block " +
      'turns the page.',
    spotlight: '[data-testid="blocks-stage"]',
  },
  {
    title: 'Change a number',
    body:
      'Tap a number tile in the track below and make the cat hop further. Blocks drag between ' +
      'tracks or to the bin — and undo is always one tap away.',
    spotlight: '[data-testid="script-area"]',
    placement: 'top-right',
  },
  {
    title: 'Stories turn their own pages',
    body:
      'Visit pages 2 and 3 with the thumbnails on the right — a picture book your child ' +
      'programs, page by page.',
    spotlight: '[aria-label="Pages"]',
    placement: 'bottom-left',
  },
  {
    title: "Now it's all yours",
    body:
      'Explore every block, character, scene and sound — it shines on a tablet, built for ' +
      'little fingers. Questions? Contact us from the banner above.',
    nextLabel: 'Explore freely ✨',
  },
];

/** The 'Press ▶ Go!' card — its Next presses the REAL Go for the user. */
const GO_CARD = 1;
const STAGE_SPOTLIGHT = '[data-testid="blocks-stage"]';

export function TryBlocksPage() {
  // Seams armed (the studio must not mount before the adapter is installed —
  // its load effect would otherwise hit the real backend).
  const [armed, setArmed] = useState(false);
  const [view, setView] = useState(0);
  const [done, setDone] = useState(false);
  // While the story PLAYS (Go pressed by the user OR by the tour's Next), the
  // spotlight sits on the stage and the tour waits for the animation to finish.
  const [playing, setPlaying] = useState(false);
  const [spotOverride, setSpotOverride] = useState<string | null>(null);
  // The studio's LIVE theme (the demo opens light, but the studio's own toggle
  // works): the overlay's scrim/backdrop re-pick on a mid-tour flip.
  const theme = useBlocksTheme((s) => s.theme);
  const goRef = useRef<(() => void) | null>(null);
  const viewRef = useRef(0);
  viewRef.current = view;

  useEffect(() => {
    installBlocksDemo();
    setArmed(true);
    return uninstallBlocksDemo;
  }, []);

  const demoValue = useMemo<DemoMode>(
    () => ({
      surface: 'blocks',
      exitHref: DEMO_EXIT_URL,
      bindBlocksGo: (go) => {
        goRef.current = go;
      },
      onStoryRun: (phase) => {
        if (phase === 'start') {
          // Spotlight the SCENE for the whole run — only while the tour is on
          // the Press-Go card (later runs are the user's own exploration).
          if (viewRef.current === GO_CARD) {
            setSpotOverride(STAGE_SPOTLIGHT);
            setPlaying(true);
          }
          return;
        }
        setSpotOverride(null);
        setPlaying(false);
        // The animation finished — move on. The next card spotlights the
        // stage too, so the handoff is zero-movement.
        if (viewRef.current === GO_CARD) setView(GO_CARD + 1);
      },
    }),
    [],
  );

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
            busy={playing}
            busyLabel="Playing… 🎬"
            spotlightOverride={spotOverride}
            darkUi={theme === 'dark'}
            onNext={() => {
              // The Press-Go card's Next presses the REAL Go for the user; the
              // run-finished callback advances. (Fallback: plain advance if the
              // studio hasn't bound yet.)
              if (view === GO_CARD && goRef.current) {
                goRef.current();
                return;
              }
              if (view >= TOUR.length - 1) setDone(true);
              else setView(view + 1);
            }}
            onBack={() => setView((v) => Math.max(0, v - 1))}
            onSkip={() => setDone(true)}
          />
        )}
      </div>
    </DemoModeProvider>
  );
}
