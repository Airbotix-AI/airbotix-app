import { Code2, Gamepad2, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { PgWindowId } from '../playgroundStore';

/** Shared metadata (title + vector icon) for the playground windows. */
export const WINDOW_META: Record<PgWindowId, { title: string; Icon: LucideIcon }> = {
  chat: { title: 'Chat', Icon: MessageSquare },
  code: { title: 'Code Editor', Icon: Code2 },
  game: { title: 'Game Runner', Icon: Gamepad2 },
};

/** Display order for the windows in the Taskbar and Desktop. */
export const WINDOW_ORDER: PgWindowId[] = ['chat', 'code', 'game'];
