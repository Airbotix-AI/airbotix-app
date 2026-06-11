// PUBLIC, no-auth Game Playground demo — `/try/playground` (try-demo-mode-prd
// §3 T1). Renders the REAL `PlaygroundApp` (unmodified) inside the demo
// provider: bundled starter VFS + in-memory persistence + the scripted agent
// behind the existing stub seam, with the guided tour overlay on top. The tour's
// "Next" drives each canned turn through the REAL chat send, so diffs land via
// the real store funnel (undo/history identical to production). After the tour:
// free explore — everything real except AI (gated to contact-us) and cloud
// features. Reload = pristine demo (D-DEMO-02).

import { useEffect, useMemo, useRef, useState } from 'react';

import { PlaygroundApp } from '../learn/playground/PlaygroundApp';
import { useProjectStore } from '../learn/playground/projectStore';
import { DemoBanner } from './DemoBanner';
import { DemoModeProvider, type DemoMode } from './demoMode';
import { DemoTourOverlay, type DemoTourStep } from './DemoTourOverlay';
import { installPlaygroundDemo, uninstallPlaygroundDemo } from './demoAdapters';
import { createScriptedDemoAgent } from './scriptedAgent';
import { PLAYGROUND_DEMO_SCRIPT } from './demoScript.playground';

// Tour cards (D-DEMO-05; copy follows the PRD mockup — adult-facing). Cards 1–3
// sit on the THREE scripted turns: each card's Next sends the NEXT canned prompt
// (`steps[card-1]`), and the card after it explains what just happened.
const TOUR: DemoTourStep[] = [
  {
    title: 'This is how a lesson starts',
    body:
      'Your child describes a game in plain words — no syntax, no setup. The demo locks the ' +
      `first prompt — “${PLAYGROUND_DEMO_SCRIPT.lockedPrompt}” — so it always builds the same ` +
      'game. Airo (scripted in this demo) builds a small, working game they can run immediately.',
    nextLabel: '▶ Start the demo',
    modal: true,
  },
  {
    title: 'A real, playable game',
    body:
      'This is the real studio, not a mock-up: real JavaScript files, a real editor, a real ' +
      'game window. Run it, drag the windows, peek at the code. In class, this moment takes ' +
      'about thirty seconds.',
    nextLabel: 'Ask: make the apples fall faster',
  },
  {
    title: 'One ask → one visible change',
    body:
      'Each request maps to one small code change the child can SEE and TEST — Airo changed a ' +
      'single speed constant. That tight loop (ask, change, play) is how the lesson teaches ' +
      'cause and effect. The Undo button above the chat reverts it, free.',
    nextLabel: 'Ask: score +10 per catch',
  },
  {
    title: 'Real code, kid-sized steps',
    body:
      'Behind the friendly chat is real JavaScript in a real editor (Monaco). Tap the changed-' +
      'file row in the chat to jump to the exact lines. Every change is undoable — the same ' +
      'history your child would use in class.',
    nextLabel: 'Ask: bigger basket + “You win!”',
  },
  {
    title: 'A finished game in 3 asks',
    body:
      "That's the whole arc of a first lesson. Now explore freely — edit the code, run, undo, " +
      'switch layout and theme. Only the AI is demo-locked (it will point you to a chat with ' +
      'us); everything else is the real product. Nothing is saved.',
    nextLabel: 'Finish & explore freely ✨',
  },
];

/** Tour card index → the scripted turn its Next fires (cards 1..3 → steps 0..2). */
const FIRST_SCRIPTED_CARD = 1;
const LAST_SCRIPTED_CARD = FIRST_SCRIPTED_CARD + PLAYGROUND_DEMO_SCRIPT.steps.length - 1;

/**
 * Re-enable the tour's Next if a canned send never lands (e.g. the kid typed
 * their own message mid-tour, so the chat was busy and the send no-op'ed). The
 * scripted turn itself settles well inside a second; this is only a recovery.
 */
const SEND_RECOVERY_MS = 6000;

export function TryPlaygroundPage() {
  // Seams armed (the studio must not mount before the adapters are installed).
  const [armed, setArmed] = useState(false);
  // The intro's "Start the demo" mounts the studio (locked prompt → build).
  const [started, setStarted] = useState(false);
  // `view` = the visible card; `frontier` = the furthest card reached. Back only
  // rewinds the VIEW — a canned turn fires only from the frontier, so browsing
  // back/forward never re-runs (or double-runs) a scripted step.
  const [view, setView] = useState(0);
  const [frontier, setFrontier] = useState(0);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const sendRef = useRef<((text: string) => void) | null>(null);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    installPlaygroundDemo(
      createScriptedDemoAgent({
        onStepApplied: (index) => {
          const card = FIRST_SCRIPTED_CARD + index + 1;
          clearTimeout(recoveryTimer.current);
          setSending(false);
          setFrontier(card);
          setView(card);
        },
      }),
    );
    setArmed(true);
    return () => {
      clearTimeout(recoveryTimer.current);
      uninstallPlaygroundDemo();
    };
  }, []);

  // Card 1 appears once the starter VFS lands (the studio is about to open).
  useEffect(() => {
    if (!started) return undefined;
    const reached = () => {
      setFrontier((f) => Math.max(f, 1));
      setView((v) => Math.max(v, 1));
    };
    if (useProjectStore.getState().files.length > 0) {
      reached();
      return undefined;
    }
    const unsub = useProjectStore.subscribe((s) => {
      if (s.files.length > 0) {
        reached();
        unsub();
      }
    });
    return unsub;
  }, [started]);

  const demoValue = useMemo<DemoMode>(
    () => ({
      surface: 'playground',
      lockedPrompt: PLAYGROUND_DEMO_SCRIPT.lockedPrompt,
      bindChatSend: (send) => {
        sendRef.current = send;
      },
    }),
    [],
  );

  const handleNext = () => {
    if (view === 0) {
      if (!started) setStarted(true);
      else setView(1);
      return;
    }
    if (view < frontier) {
      // Browsing back through earlier cards — move the view only.
      setView(view + 1);
      return;
    }
    if (view >= FIRST_SCRIPTED_CARD && view <= LAST_SCRIPTED_CARD) {
      // At the frontier on a scripted card: fire the canned turn through the
      // REAL chat; `onStepApplied` advances the tour when the diff lands.
      const step = PLAYGROUND_DEMO_SCRIPT.steps[view - FIRST_SCRIPTED_CARD];
      if (sendRef.current) {
        setSending(true);
        clearTimeout(recoveryTimer.current);
        recoveryTimer.current = setTimeout(() => setSending(false), SEND_RECOVERY_MS);
        sendRef.current(step.prompt);
      }
      return;
    }
    setDone(true); // the final card → free explore
  };

  return (
    <DemoModeProvider value={demoValue}>
      <div className="flex h-screen w-full flex-col overflow-hidden">
        <DemoBanner />
        <div className="relative min-h-0 flex-1">
          {armed && started ? <PlaygroundApp /> : <div className="h-full w-full bg-ink/5" />}
        </div>
        {!done && (
          <DemoTourOverlay
            steps={TOUR}
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
