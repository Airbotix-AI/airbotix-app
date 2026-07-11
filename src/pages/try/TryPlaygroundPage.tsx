// PUBLIC, no-auth Creative Code Studio demo — `/try/playground` (try-demo-mode-prd
// §3 T1 v3). Renders the REAL `PlaygroundApp` (unmodified) inside the demo
// provider: it starts on the REAL landing phase (prompt pre-filled + locked),
// plays the REAL generating progress (the bundled starter "streams" file-by-file
// through the same UI a real first turn drives), and the tour sequences the
// studio's REAL affordances — landing submit, chat sends (scripted agent behind
// the stub seam), run/restart, the editor's jump+highlight, the live selection →
// "✨ Explain this" toolbar (selected on one card, fired on the next), and the
// Asset Viewer's own generate bar → details view → remix bar → into-the-game
// loop — through the seams the studio registers (`demoMode.tsx`). Every action
// runs AFTER the card/spotlight transition paints (`afterPaint`), and an
// after-edit restart re-fronts the panel the next card discusses
// (`restartThenRefocus`). After the tour: free explore — everything real except
// AI (gated to contact-us) and cloud features. Reload = pristine (D-DEMO-02).

import { useEffect, useMemo, useRef, useState } from 'react';

import { PlaygroundApp } from '../learn/playground/PlaygroundApp';
import { usePlaygroundStore } from '../learn/playground/playgroundStore';
import { useProjectStore } from '../learn/playground/projectStore';
import { DemoBanner } from './DemoBanner';
import {
  DemoModeProvider,
  type DemoAssetPaneControls,
  type DemoMode,
  type DemoRemixControls,
  type DemoShareControls,
  type DemoStudioControls,
} from './demoMode';
import { DemoTourOverlay } from './DemoTourOverlay';
import {
  installPlaygroundDemo,
  TRY_PLAYGROUND_PROJECT_ID,
  uninstallPlaygroundDemo,
} from './demoAdapters';
import { createScriptedDemoAgent } from './scriptedAgent';
import { DEMO_GUIDE_TOUR_DOC } from './demoHelp.playground';
import {
  locateLines,
  PLAYGROUND_DEMO_SCRIPT,
  TOUR_ASSET_PROMPT,
  TOUR_REMIX_PROMPT,
} from './demoScript.playground';
import { PLAYGROUND_TOUR, type PlaygroundTourAction } from './demoTour.playground';
import {
  afterPaint,
  cardForScriptStep,
  pendingSpotlightFor,
  demoGuideRect,
  restartThenRefocus,
  spotlightPanel,
} from './tourSequencing';

/**
 * Re-enable the tour's Next if a fired action never lands (e.g. the kid typed
 * their own message mid-tour, so the chat was busy and the send no-op'ed). The
 * scripted turn itself settles well inside a second; this is only a recovery.
 */
const SEND_RECOVERY_MS = 6000;
/** The landing build plays a multi-second reveal — its recovery must outlast it
 *  comfortably (a premature recovery would invite a game-restarting re-submit). */
const LANDING_RECOVERY_MS = 20_000;
/** Each asset step runs ONE stub generation (~1s) — a roomier recovery. */
const ASSET_RECOVERY_MS = 15_000;
/** Poll cadence for an asset step's generate-until-landed sequence. */
const ASSET_TICK_MS = 250;
/** Retry an asset request only every Nth tick (~2s) — see runAssetStep. */
const ASSET_RETRY_TICKS = 8;
/** A retry refills the pane's prompt box first (a submit clears it), then
 *  submits one beat later so the refill has rendered into the real handler. */
const REFILL_SUBMIT_MS = 50;
/** After an asset lands: how long the chat keeps the stage so the finished
 *  sticker bubble is SEEN before My Assets is surfaced with the card swap. */
const ASSET_RESULT_BEAT_MS = 1600;

/** A generated Asset Viewer entry (the generation store's output directory). */
const isGeneratedAsset = (path: string) => path.startsWith('assets/generated/');

export function TryPlaygroundPage() {
  // Seams armed (the studio must not mount before the adapters are installed).
  const [armed, setArmed] = useState(false);
  // `view` = the visible card; `frontier` = the furthest card reached. Back only
  // rewinds the VIEW — an action fires only from the frontier, so browsing
  // back/forward never re-runs (or double-runs) a step.
  const [view, setView] = useState(0);
  const [frontier, setFrontier] = useState(0);
  const [sending, setSending] = useState(false);
  // While a chat-bound action is in flight: the spotlight sits on the Chat
  // window from the CLICK (before the send), not from when the reply settles.
  const [spotOverride, setSpotOverride] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // The studio's LIVE theme (store subscription, not a mount-time read): the
  // overlay's scrim/backdrop re-pick the moment the kid flips the taskbar
  // toggle mid-tour (ink@50% is imperceptible over the dark workspace).
  const theme = usePlaygroundStore((s) => s.theme);
  const layoutMode = usePlaygroundStore((s) => s.layoutMode);
  const sendRef = useRef<((text: string) => void) | null>(null);
  const landingSubmitRef = useRef<(() => void) | null>(null);
  const controlsRef = useRef<DemoStudioControls | null>(null);
  const assetPaneRef = useRef<DemoAssetPaneControls | null>(null);
  const remixRef = useRef<DemoRemixControls | null>(null);
  const shareRef = useRef<DemoShareControls | null>(null);
  // Wishes typed "into" a pane that hasn't mounted/bound yet — applied on bind
  // (the assets window opens, the details view's remix bar mounts, then fills).
  const pendingGenPromptRef = useRef<string | null>(null);
  const pendingRemixPromptRef = useRef<string | null>(null);
  // First controls bind = the workspace has mounted (§3 step 2 auto-run fires once).
  const enteredRef = useRef(false);
  // The landing submit fired (cleared only by its recovery) — see 'landing-create'.
  const landingFiredRef = useRef(false);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout>>();
  const assetTimer = useRef<ReturnType<typeof setInterval>>();

  const stopAssetWatch = () => {
    clearInterval(assetTimer.current);
    assetTimer.current = undefined;
  };

  const armRecovery = (ms: number) => {
    clearTimeout(recoveryTimer.current);
    recoveryTimer.current = setTimeout(() => {
      stopAssetWatch();
      setSending(false);
      setSpotOverride(null); // the action never landed — restore the card's own
    }, ms);
  };

  /** Reveal card `card` (and extend the frontier to it). */
  const advanceTo = (card: number) => {
    clearTimeout(recoveryTimer.current);
    setSending(false);
    // The next card's own spotlight takes over. For chat-bound steps it IS the
    // chat selector the override already points at — so zero mask movement.
    setSpotOverride(null);
    setFrontier((f) => Math.max(f, card));
    setView(card);
    // Universal visibility guarantee: whatever surface the revealed card
    // spotlights is FRONTED (window mode: on top of all windows; split: its
    // tab activated). Idempotent with the action/restart/flip refocus paths.
    const panel = spotlightPanel(PLAYGROUND_TOUR[card]?.spotlight);
    if (panel) afterPaint(() => controlsRef.current?.focusPanel(panel));
  };

  useEffect(() => {
    installPlaygroundDemo(
      createScriptedDemoAgent({
        onStepApplied: (index) => {
          const nextCard = cardForScriptStep(index) + 1;
          advanceTo(nextCard);
          // §3: after EVERY scripted change, restart the running game through
          // the real restart path so the change visibly takes effect — then
          // re-front the panel the next card spotlights (the restart focuses
          // the Game Runner, which would bury e.g. the conversation).
          // setTimeout(0) lets the chat hook apply the turn's files first
          // (explains don't edit).
          if (PLAYGROUND_DEMO_SCRIPT.steps[index]?.kind === 'edit') {
            setTimeout(
              () => restartThenRefocus(controlsRef.current, PLAYGROUND_TOUR[nextCard]?.spotlight),
              0,
            );
          }
        },
      }),
    );
    setArmed(true);
    return () => {
      clearTimeout(recoveryTimer.current);
      clearInterval(assetTimer.current);
      uninstallPlaygroundDemo();
    };
  }, []);

  // A mid-tour Windows ↔ Split flip (the taskbar's real LayoutToggle) re-fronts
  // the surface the current spotlight points at — same rule as browsing
  // (`reveal`): the in-flight override (the chat, while Airo works) or the
  // visible card's panel must stay resolvable in the new layout. `focusPanel`
  // routes per the LIVE layout (open/focus the window, or switch the split
  // tab); the overlay's mask re-measures on its own poll. After the tour the
  // layout is the user's to rearrange — no re-fronting.
  const viewRef = useRef(view);
  viewRef.current = view;
  const spotOverrideRef = useRef(spotOverride);
  spotOverrideRef.current = spotOverride;
  const doneRef = useRef(done);
  doneRef.current = done;
  useEffect(() => {
    let lastLayout = usePlaygroundStore.getState().layoutMode;
    return usePlaygroundStore.subscribe((s) => {
      if (s.layoutMode === lastLayout) return;
      lastLayout = s.layoutMode;
      if (doneRef.current) return;
      const selector = spotOverrideRef.current ?? PLAYGROUND_TOUR[viewRef.current]?.spotlight;
      const panel = spotlightPanel(selector);
      if (panel) afterPaint(() => controlsRef.current?.focusPanel(panel));
    });
  }, []);

  const demoValue = useMemo<DemoMode>(
    () => ({
      surface: 'playground',
      lockedPrompt: PLAYGROUND_DEMO_SCRIPT.lockedPrompt,
      firstTurnReply: PLAYGROUND_DEMO_SCRIPT.firstTurnReply,
      // §3 step 11 (D-DEMO-09): the demo runs project-less, so supply a fixed id
      // to surface the real Share button (the in-memory adapter intercepts it).
      shareProjectId: TRY_PLAYGROUND_PROJECT_ID,
      bindShareControls: (controls) => {
        shareRef.current = controls;
      },
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
      bindAssetPane: (controls) => {
        assetPaneRef.current = controls;
        if (pendingGenPromptRef.current) {
          controls.setGeneratePrompt(pendingGenPromptRef.current);
          pendingGenPromptRef.current = null;
        }
      },
      bindAssetRemix: (controls) => {
        remixRef.current = controls;
        if (pendingRemixPromptRef.current) {
          controls.setPrompt(pendingRemixPromptRef.current);
          pendingRemixPromptRef.current = null;
        }
      },
    }),
    [],
  );

  /** The Asset Viewer's generated entries, newest last. */
  const generatedAssets = () =>
    useProjectStore.getState().files.filter((f) => isGeneratedAsset(f.path));

  /**
   * §3 step 7a/7b: run ONE generation through the Asset Viewer's REAL submit
   * path (crafted offline art; zero network) and advance when it lands. Driven
   * by a small poll so the call retries until the one-AI-at-a-time lock frees
   * up; the generation itself plays in the chat, exactly like the real product.
   */
  const runAssetStep = (
    fromCard: number,
    fire: () => void,
    onLanded?: (path: string) => void,
  ) => {
    const baseline = generatedAssets().length;
    setSending(true);
    armRecovery(ASSET_RECOVERY_MS);
    // The generation plays in the CHAT (progress + the finished sticker
    // bubble, exactly like the real product) — front it for the wait.
    afterPaint(() => controlsRef.current?.focusPanel('chat'));
    stopAssetWatch();
    let tick = 0;
    assetTimer.current = setInterval(() => {
      tick += 1;
      const landed = generatedAssets();
      if (landed.length >= baseline + 1) {
        stopAssetWatch();
        const path = landed[landed.length - 1].path;
        // Hold a beat on the chat so the new art is SEEN (stick-to-bottom
        // keeps the bubble in view), then surface My Assets with the swap.
        // The details open AFTER the pane is back on screen: the split layout
        // UNMOUNTS the Asset Viewer while the chat tab has the stage, so the
        // remounted pane must re-bind its seam before `onLanded` drives it.
        clearTimeout(recoveryTimer.current);
        recoveryTimer.current = setTimeout(() => {
          controlsRef.current?.focusPanel('assets');
          afterPaint(() => {
            onLanded?.(path);
            advanceTo(fromCard + 1);
          });
        }, ASSET_RESULT_BEAT_MS);
      } else if (tick % ASSET_RETRY_TICKS === 1) {
        // No-ops while the chat lock is busy. Retried SPARINGLY (every ~2s, not
        // every tick): an accepted attempt appends chat bubbles, so a hot loop
        // would spam the conversation if a generation ever failed.
        fire();
      }
    }, ASSET_TICK_MS);
  };

  /** Run a frontier card's action through the studio's real affordances. Cards
   *  that advance immediately swap the card FIRST and run the heavy driving
   *  behind `afterPaint`, so the transition never stutters (§3 v3 jank rule). */
  const fireAction = (action: PlaygroundTourAction, card: number) => {
    // Chat-bound actions: spotlight the conversation BEFORE the send fires.
    const pending = pendingSpotlightFor(action.kind);
    if (pending) setSpotOverride(pending);
    switch (action.kind) {
      case 'landing-create':
        // Drive the REAL landing submit; the workspace-entry bind advances.
        // Fires ONCE per recovery window: on a slow machine the recovery could
        // re-enable Next mid-build, and a second submit would restart the
        // generating screen. After the (long) recovery a genuine retry is open.
        if (landingFiredRef.current) return;
        landingFiredRef.current = true;
        setSending(true);
        clearTimeout(recoveryTimer.current);
        recoveryTimer.current = setTimeout(() => {
          landingFiredRef.current = false;
          setSending(false);
        }, LANDING_RECOVERY_MS);
        landingSubmitRef.current?.();
        return;
      case 'script': {
        const step = PLAYGROUND_DEMO_SCRIPT.steps[action.step];
        setSending(true);
        armRecovery(SEND_RECOVERY_MS);
        afterPaint(() => {
          // §3 v2 (focus rule): the conversation must be on top while Airo works.
          controlsRef.current?.focusPanel('chat');
          if (step.kind === 'edit') sendRef.current?.(step.prompt);
        });
        return; // `onStepApplied` advances when the canned turn settles
      }
      case 'show-diff': {
        // The changed-file-row jump: open the editor on the changed lines.
        const step = PLAYGROUND_DEMO_SCRIPT.steps[action.step];
        advanceTo(card + 1);
        afterPaint(() => {
          if (step.kind !== 'edit') return;
          const content =
            useProjectStore.getState().files.find((f) => f.path === step.path)?.content ?? '';
          const range = locateLines(content, step.edits[0].replace);
          if (range) controlsRef.current?.openFileAt(step.path, range.from, range.to);
        });
        return;
      }
      case 'explain-select': {
        // §3 step 6, card A: SELECT the snippet through the editor's real jump
        // path — the real selection pipeline pops the live "✨ Explain this"
        // toolbar over it. No turn fires; the next card describes the toolbar.
        const step = PLAYGROUND_DEMO_SCRIPT.steps[action.step];
        advanceTo(card + 1);
        afterPaint(() => {
          if (step.kind !== 'explain') return;
          const content =
            useProjectStore.getState().files.find((f) => f.path === step.path)?.content ?? '';
          const range = locateLines(content, step.snippet);
          controlsRef.current?.focusPanel('code');
          if (range) controlsRef.current?.openFileAt(step.path, range.from, range.to, true);
        });
        return;
      }
      case 'explain-fire': {
        // §3 step 6, card B: fire the toolbar's REAL handler (the same one its
        // click invokes — the prompt is byte-identical to a real tap, which the
        // scripted agent's matcher drift-alarms); the answer lands in the chat.
        const step = PLAYGROUND_DEMO_SCRIPT.steps[action.step];
        setSending(true);
        armRecovery(SEND_RECOVERY_MS);
        afterPaint(() => {
          if (step.kind === 'explain') controlsRef.current?.explainSelection(step.snippet);
        });
        return; // `onStepApplied` advances when the canned turn settles
      }
      case 'asset-prompt':
        // §3 step 7a, card A: surface the Asset Viewer and type the wish into
        // the pane's REAL generate box (pending until the pane binds if its
        // window hadn't been opened yet).
        advanceTo(card + 1);
        afterPaint(() => {
          controlsRef.current?.focusPanel('assets');
          if (assetPaneRef.current) assetPaneRef.current.setGeneratePrompt(TOUR_ASSET_PROMPT);
          else pendingGenPromptRef.current = TOUR_ASSET_PROMPT;
        });
        return;
      case 'asset-generate':
        // §3 step 7a, card B: submit through the pane's REAL Generate path (the
        // exact handler its ✨ button calls). Retries refill the box first (a
        // submit clears it) and re-submit a beat later.
        runAssetStep(card, () => {
          assetPaneRef.current?.setGeneratePrompt(TOUR_ASSET_PROMPT);
          setTimeout(() => assetPaneRef.current?.submitGenerate(), REFILL_SUBMIT_MS);
        });
        return;
      case 'asset-details': {
        // §3 step 7b, card A: open the generated sticker's REAL details view
        // (the same path tapping its card runs) and pre-type the remix wish into
        // the details view's real Remix bar (it binds when the view mounts).
        const sticker = generatedAssets().at(-1);
        advanceTo(card + 1);
        afterPaint(() => {
          controlsRef.current?.focusPanel('assets');
          pendingRemixPromptRef.current = TOUR_REMIX_PROMPT;
          if (sticker) assetPaneRef.current?.openAssetDetails(sticker.path);
        });
        return;
      }
      case 'asset-remix':
        // §3 step 7b, card B: submit the details view's REAL Remix path. When
        // the remix lands, open ITS details so the result is what's on screen.
        runAssetStep(
          card,
          () => {
            remixRef.current?.setPrompt(TOUR_REMIX_PROMPT);
            setTimeout(() => remixRef.current?.submit(), REFILL_SUBMIT_MS);
          },
          (path) => assetPaneRef.current?.openAssetDetails(path),
        );
        return;
      case 'open-guide': {
        // §3 step 10: the Guide opens directly on its most diagram-rich page —
        // sized WIDE so the demo shows the two-column layout (topics + content
        // together). The rect MUST land before anything mounts the window:
        // react-rnd is uncontrolled (geometry seeds at mount only) and
        // advanceTo's visibility guarantee opens/fronts it a frame later.
        const st = usePlaygroundStore.getState();
        if (st.layoutMode === 'window' && !st.windows.help.open) {
          st.setRect('help', demoGuideRect(window.innerWidth, window.innerHeight));
        }
        advanceTo(card + 1);
        afterPaint(() => controlsRef.current?.openGuide(DEMO_GUIDE_TOUR_DOC));
        return;
      }
      // ── Share block (§3 step 11 / D-DEMO-09) — drive the REAL share panel, then
      // the REAL public play page. The popup stays open across these cards
      // (auto-close is gated in demo); each action advances after the panel's new
      // state has painted so the next card spotlights a present element.
      case 'share-open':
        shareRef.current?.openPanel();
        afterPaint(() => advanceTo(card + 1));
        return;
      case 'share-request':
        shareRef.current?.requestShare();
        afterPaint(() => advanceTo(card + 1));
        return;
      case 'share-approve':
        shareRef.current?.approve();
        afterPaint(() => advanceTo(card + 1));
        return;
      case 'share-recipient':
        // Opens /play/:shareId in a REAL new tab — the unmodified PublicPlayPage
        // playing the bundled snapshot (zero network) — then closes the panel so
        // its high-z popup no longer overlaps the free-explore card's controls.
        shareRef.current?.openRecipient();
        shareRef.current?.closePanel();
        advanceTo(card + 1);
        return;
      case 'advance':
        advanceTo(card + 1);
        return;
      case 'finish':
        setDone(true);
    }
  };

  /** Show an already-visited card: move the view AND re-front the window its
   *  spotlight points at — browsing back/forth must keep the surface each card
   *  discusses on top, not whatever the last action left focused. */
  const reveal = (card: number) => {
    setView(card);
    const panel = spotlightPanel(PLAYGROUND_TOUR[card]?.spotlight);
    if (panel) afterPaint(() => controlsRef.current?.focusPanel(panel));
  };

  const handleNext = () => {
    if (view < frontier) {
      // Browsing forward through earlier cards — reveal only, never re-fire.
      reveal(view + 1);
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
            spotlightOverride={spotOverride}
            splitLayout={layoutMode === 'split'}
            darkUi={theme === 'dark'}
            onNext={handleNext}
            onBack={() => reveal(Math.max(0, view - 1))}
            onSkip={() => setDone(true)}
          />
        )}
      </div>
    </DemoModeProvider>
  );
}
