// PUBLIC, no-auth Game Playground demo — `/try/playground` (try-demo-mode-prd
// §3 T1 v2). Renders the REAL `PlaygroundApp` (unmodified) inside the demo
// provider: it starts on the REAL landing phase (prompt pre-filled + locked),
// plays the REAL generating progress (the bundled starter "streams" file-by-file
// through the same UI a real first turn drives), and the tour sequences the
// studio's REAL affordances — landing submit, chat sends (scripted agent behind
// the stub seam), run/restart, the editor's jump+highlight, the live selection →
// "✨ Explain this" toolbar, the Asset Viewer's generate → remix → into-the-game
// loop, and the Game Guide — through the seams the studio registers
// (`demoMode.tsx`). After the tour: free explore — everything real except AI
// (gated to contact-us) and cloud features. Reload = pristine demo (D-DEMO-02).

import { useEffect, useMemo, useRef, useState } from 'react';

import { PlaygroundApp } from '../learn/playground/PlaygroundApp';
import { useProjectStore } from '../learn/playground/projectStore';
import { DemoBanner } from './DemoBanner';
import { DemoModeProvider, type DemoMode, type DemoStudioControls } from './demoMode';
import { DemoTourOverlay } from './DemoTourOverlay';
import { installPlaygroundDemo, uninstallPlaygroundDemo } from './demoAdapters';
import { createScriptedDemoAgent } from './scriptedAgent';
import { DEMO_GUIDE_TOUR_DOC } from './demoHelp.playground';
import {
  locateLines,
  PLAYGROUND_DEMO_SCRIPT,
  TOUR_ASSET_PROMPT,
  TOUR_REMIX_PROMPT,
} from './demoScript.playground';
import { PLAYGROUND_TOUR, type PlaygroundTourAction } from './demoTour.playground';

/**
 * Re-enable the tour's Next if a fired action never lands (e.g. the kid typed
 * their own message mid-tour, so the chat was busy and the send no-op'ed). The
 * scripted turn itself settles well inside a second; this is only a recovery.
 */
const SEND_RECOVERY_MS = 6000;
/** Each asset step runs ONE stub generation (~1s) — a roomier recovery. */
const ASSET_RECOVERY_MS = 15_000;
/** Poll cadence for an asset step's generate-until-landed sequence. */
const ASSET_TICK_MS = 250;
/** §3 step 6: how long the real "✨ Explain this" toolbar stays visibly poised
 *  over the selection before the tour fires it — long enough to SEE the real
 *  affordance, short enough to keep the beat moving. */
const EXPLAIN_TOOLBAR_MS = 1600;

/** A generated Asset Viewer entry (the generation store's output directory). */
const isGeneratedAsset = (path: string) => path.startsWith('assets/generated/');

/** The tour card whose Next fires script step `index`. */
function cardForScriptStep(index: number): number {
  return PLAYGROUND_TOUR.findIndex(
    (c) => c.action.kind === 'script' && c.action.step === index,
  );
}

export function TryPlaygroundPage() {
  // Seams armed (the studio must not mount before the adapters are installed).
  const [armed, setArmed] = useState(false);
  // `view` = the visible card; `frontier` = the furthest card reached. Back only
  // rewinds the VIEW — an action fires only from the frontier, so browsing
  // back/forward never re-runs (or double-runs) a step.
  const [view, setView] = useState(0);
  const [frontier, setFrontier] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const sendRef = useRef<((text: string) => void) | null>(null);
  const landingSubmitRef = useRef<(() => void) | null>(null);
  const controlsRef = useRef<DemoStudioControls | null>(null);
  // First controls bind = the workspace has mounted (§3 step 2 auto-run fires once).
  const enteredRef = useRef(false);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout>>();
  const assetTimer = useRef<ReturnType<typeof setInterval>>();
  const explainTimer = useRef<ReturnType<typeof setTimeout>>();

  const stopAssetWatch = () => {
    clearInterval(assetTimer.current);
    assetTimer.current = undefined;
  };

  const armRecovery = (ms: number) => {
    clearTimeout(recoveryTimer.current);
    recoveryTimer.current = setTimeout(() => {
      stopAssetWatch();
      setSending(false);
    }, ms);
  };

  /** Reveal card `card` (and extend the frontier to it). */
  const advanceTo = (card: number) => {
    clearTimeout(recoveryTimer.current);
    setSending(false);
    setFrontier((f) => Math.max(f, card));
    setView(card);
  };

  useEffect(() => {
    installPlaygroundDemo(
      createScriptedDemoAgent({
        onStepApplied: (index) => {
          advanceTo(cardForScriptStep(index) + 1);
          // §3: after EVERY scripted change, restart the running game through the
          // real restart path so the change visibly takes effect. setTimeout(0)
          // lets the chat hook apply the turn's files first (explains don't edit).
          if (PLAYGROUND_DEMO_SCRIPT.steps[index]?.kind === 'edit') {
            setTimeout(() => controlsRef.current?.runGame(), 0);
          }
        },
      }),
    );
    setArmed(true);
    return () => {
      clearTimeout(recoveryTimer.current);
      clearInterval(assetTimer.current);
      clearTimeout(explainTimer.current);
      uninstallPlaygroundDemo();
    };
  }, []);

  const demoValue = useMemo<DemoMode>(
    () => ({
      surface: 'playground',
      lockedPrompt: PLAYGROUND_DEMO_SCRIPT.lockedPrompt,
      firstTurnReply: PLAYGROUND_DEMO_SCRIPT.firstTurnReply,
      bindLandingSubmit: (submit) => {
        landingSubmitRef.current = submit;
      },
      bindChatSend: (send) => {
        sendRef.current = send;
      },
      bindStudioControls: (controls) => {
        controlsRef.current = controls;
        if (!enteredRef.current) {
          // Workspace entry (§3 step 2): reveal "Meet your game" and auto-open
          // + start the Game Runner through the editor's real ▶ Play path.
          enteredRef.current = true;
          clearTimeout(recoveryTimer.current);
          setSending(false);
          setFrontier((f) => Math.max(f, 1));
          setView((v) => Math.max(v, 1));
          controls.runGame();
        }
      },
    }),
    [],
  );

  /** The Asset Viewer's generated entries, newest last. */
  const generatedAssets = () =>
    useProjectStore.getState().files.filter((f) => isGeneratedAsset(f.path));

  /**
   * §3 step 7a/7b: run ONE generation through the studio's REAL viewer entry
   * (crafted offline art; zero network) and advance when it lands. Driven by a
   * small poll so the call retries until the one-AI-at-a-time lock frees up; the
   * acting surface (Asset Viewer) is focused at start and again on the result —
   * the generation itself plays in the chat, exactly like the real product.
   */
  const runAssetStep = (fromCard: number, fire: () => void) => {
    const baseline = generatedAssets().length;
    setSending(true);
    armRecovery(ASSET_RECOVERY_MS);
    controlsRef.current?.focusPanel('assets');
    stopAssetWatch();
    assetTimer.current = setInterval(() => {
      if (generatedAssets().length >= baseline + 1) {
        stopAssetWatch();
        controlsRef.current?.focusPanel('assets');
        advanceTo(fromCard + 1);
      } else {
        fire(); // no-ops while the chat lock is busy → retried next tick
      }
    }, ASSET_TICK_MS);
  };

  /** Run a frontier card's action through the studio's real affordances. */
  const fireAction = (action: PlaygroundTourAction, card: number) => {
    switch (action.kind) {
      case 'landing-create':
        // Drive the REAL landing submit; the workspace-entry bind advances.
        setSending(true);
        armRecovery(SEND_RECOVERY_MS);
        landingSubmitRef.current?.();
        return;
      case 'script': {
        const step = PLAYGROUND_DEMO_SCRIPT.steps[action.step];
        setSending(true);
        armRecovery(SEND_RECOVERY_MS);
        if (step.kind === 'explain') {
          // §3 step 6: SELECT the snippet through the editor's real jump path —
          // the real selection pipeline pops the "✨ Explain this" toolbar over
          // it. Hold that beat so the user SEES the toolbar, then fire the same
          // handler its click invokes (which surfaces the chat for the answer).
          const content =
            useProjectStore.getState().files.find((f) => f.path === step.path)?.content ?? '';
          const range = locateLines(content, step.snippet);
          controlsRef.current?.focusPanel('code');
          if (range) controlsRef.current?.openFileAt(step.path, range.from, range.to, true);
          clearTimeout(explainTimer.current);
          explainTimer.current = setTimeout(
            () => controlsRef.current?.explainSelection(step.snippet),
            EXPLAIN_TOOLBAR_MS,
          );
        } else {
          // §3 v2 (focus rule): the conversation must be on top while Airo works.
          controlsRef.current?.focusPanel('chat');
          sendRef.current?.(step.prompt);
        }
        return; // `onStepApplied` advances when the canned turn settles
      }
      case 'show-diff': {
        // The changed-file-row jump: open the editor on the changed lines.
        const step = PLAYGROUND_DEMO_SCRIPT.steps[action.step];
        if (step.kind === 'edit') {
          const content =
            useProjectStore.getState().files.find((f) => f.path === step.path)?.content ?? '';
          const range = locateLines(content, step.edits[0].replace);
          if (range) controlsRef.current?.openFileAt(step.path, range.from, range.to);
        }
        advanceTo(card + 1);
        return;
      }
      case 'asset-generate':
        runAssetStep(card, () => controlsRef.current?.requestAssetGen(TOUR_ASSET_PROMPT));
        return;
      case 'asset-remix': {
        // Remix the just-generated sticker (the newest generated entry).
        const ref = generatedAssets().at(-1);
        runAssetStep(card, () =>
          controlsRef.current?.requestAssetGen(TOUR_REMIX_PROMPT, { refAssetPath: ref?.path }),
        );
        return;
      }
      case 'open-guide':
        // §3 step 10: the Guide opens directly on its most diagram-rich page.
        controlsRef.current?.openGuide(DEMO_GUIDE_TOUR_DOC);
        advanceTo(card + 1);
        return;
      case 'advance':
        advanceTo(card + 1);
        return;
      case 'finish':
        setDone(true);
    }
  };

  const handleNext = () => {
    if (view < frontier) {
      // Browsing back through earlier cards — move the view only.
      setView(view + 1);
      return;
    }
    const card = PLAYGROUND_TOUR[view];
    if (card) fireAction(card.action, view);
  };

  return (
    <DemoModeProvider value={demoValue}>
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <DemoBanner />
        <div className="relative min-h-0 flex-1">
          {armed ? <PlaygroundApp /> : <div className="h-full w-full bg-ink/5" />}
        </div>
        {!done && (
          <DemoTourOverlay
            steps={PLAYGROUND_TOUR}
            step={view}
            busy={sending}
            onNext={handleNext}
            onBack={() => setView((v) => Math.max(0, v - 1))}
            onSkip={() => setDone(true)}
          />
        )}
      </div>
    </DemoModeProvider>
  );
}
