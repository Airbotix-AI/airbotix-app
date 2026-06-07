import { useState } from 'react';

import { useWsEvent } from '@/lib/useWsEvent';
import { nextHelpState, type HelpEvent, type HelpState } from './teacherHelp';

const COPY: Record<Exclude<HelpState, 'none'>, { emoji: string; text: string }> = {
  waiting: { emoji: '🖐', text: 'Your teacher knows — she’s coming!' },
  takeover: { emoji: '🕹', text: 'Your teacher is helping in your game. You’re paused.' },
};

/**
 * Child-facing banner shown in the kid's studio when the teacher raises/answers a
 * hand or takes over (PRD §11f transparency + §17.16/§17.17). Self-contained: it
 * listens for the kid-session `teacher.help` WS event and renders nothing until
 * one arrives, so it can be dropped into the studio without touching its wiring.
 */
export function TeacherHelpingIndicator() {
  const [state, setState] = useState<HelpState>('none');
  useWsEvent<HelpEvent>('teacher.help', (ev) => setState((p) => nextHelpState(p, ev)));

  if (state === 'none') return null;
  const { emoji, text } = COPY[state];

  return (
    <div
      data-testid="teacher-helping-indicator"
      data-state={state}
      role="status"
      className="flex items-center gap-2 rounded-2xl bg-wash-sky px-4 py-2 text-[14px] font-semibold text-ink"
    >
      <span aria-hidden>{emoji}</span>
      <span>{text}</span>
    </div>
  );
}
