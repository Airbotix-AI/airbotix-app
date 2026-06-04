import { useState } from 'react';

import { useWsEvent } from '@/lib/useWsEvent';

export interface Announcement {
  /** WS event name to listen for (e.g. 'approval.new'). */
  event: string;
  /** Short, polite text a screen reader will speak when the event fires. */
  message: string;
}

function Subscription({
  event,
  message,
  onFire,
}: {
  event: string;
  message: string;
  onFire: (m: string) => void;
}) {
  useWsEvent(event, () => onFire(message), []);
  return null;
}

/**
 * Screen-reader live region. Real-time WS updates (a kid's approval request, a
 * Stars balance change) otherwise only surface as a toast / badge change —
 * invisible to non-sighted users. This speaks them politely. WCAG 4.1.3 Status
 * Messages (Level AA). Each surface passes the events relevant to it.
 */
export function LiveAnnouncer({ announcements }: { announcements: Announcement[] }) {
  const [text, setText] = useState('');
  return (
    <>
      {announcements.map((a) => (
        <Subscription key={a.event} event={a.event} message={a.message} onFire={setText} />
      ))}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {text}
      </div>
    </>
  );
}
