// Pure child-facing take-over state (no React) — kept in its own module so the
// indicator component file exports only a component (react-refresh hygiene).

/** The child-facing help states the kid's session can show (§17.16/§17.17):
 *  none (hidden) · waiting ("she's coming") · takeover ("teacher has the wheel"). */
export type HelpState = 'none' | 'waiting' | 'takeover';

export interface HelpEvent {
  state: HelpState;
}

/** Reduce a help event to the next visible state. */
export function nextHelpState(_prev: HelpState, ev: HelpEvent): HelpState {
  return ev.state;
}
