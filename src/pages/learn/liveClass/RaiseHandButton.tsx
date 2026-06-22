// "🙋 Ask my teacher" raise-hand control for the live-class studios (D-LIVE-1,
// learn-game-studio-prd J4 `ask-teacher` / `raise-hand-waiting`).
//
// Visibility rules (both enforced by the caller passing the right props, but
// double-guarded here):
//  - HIDDEN in the teacher read-only viewer (`readOnly`) — a teacher viewing a
//    kid's studio must never raise that kid's hand.
//  - HIDDEN when the kid is not in a live class (no `class_id` claim) — raising a
//    hand only makes sense inside a class.
//
// States: idle "🙋 Ask my teacher" → raised "✋ Hand up · tap to lower" (a calm,
// persistent waiting cue, not an alarm — J4). One tap toggles; no text is ever
// attached (the teacher infers context via Peek).

import { useKidClassId } from '@/auth/authStore';

import { useRaiseHand } from './raiseHand';

export function RaiseHandButton({ readOnly = false }: { readOnly?: boolean }) {
  const classId = useKidClassId();
  const { raised, raise, lowerOwn } = useRaiseHand();

  // Teacher viewer or not-in-a-class → render nothing.
  if (readOnly || !classId) return null;

  return (
    <button
      type="button"
      data-testid={raised ? 'raise-hand-waiting' : 'ask-teacher'}
      aria-pressed={raised}
      onClick={() => (raised ? lowerOwn() : raise())}
      title={raised ? 'Your teacher knows you need help — tap to lower your hand' : 'Ask your teacher for help'}
      className={
        raised
          ? 'inline-flex h-11 items-center whitespace-nowrap rounded-full bg-brand-sunshine px-5 text-[15px] font-extrabold text-ink shadow-brand-sunshine transition hover:-translate-y-0.5'
          : 'inline-flex h-11 items-center whitespace-nowrap rounded-full bg-brand-bubblegum px-5 text-[15px] font-extrabold text-white shadow-brand-bubblegum transition hover:-translate-y-0.5'
      }
    >
      {raised ? '✋ Hand up · tap to lower' : '🙋 Ask my teacher'}
    </button>
  );
}
