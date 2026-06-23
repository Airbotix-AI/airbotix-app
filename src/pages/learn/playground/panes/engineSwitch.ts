// Detect an explicit "switch this game between 2D and 3D" request (D-3D-08).
//
// A switch REWRITES the whole game in a different engine, so it must be confirmed —
// unlike an ordinary edit. We only treat a prompt as a switch when it pairs a
// switch VERB (make/turn/switch/convert/change/rebuild/redo/remake) with a clear
// dimension cue (3D/three.js or 2D) for the OTHER engine. So "make it 3D" on a 2D
// game triggers the confirm, while "add 3D-looking shadows" (no switch verb) stays
// a normal edit, and "make it 3D" on a game that is ALREADY 3D does nothing.

import type { GameEngine } from '../buildGamePreview';

const HAS_3D = /\b3\s?-?d\b|\bthree\.?js\b/i;
const HAS_2D = /\b2\s?-?d\b/i;
const SWITCH_VERB = /\b(make|turn|switch|convert|change|rebuild|redo|remake|recreate)\b/i;

/**
 * Returns the target engine if `text` is an explicit request to switch the game to
 * the OTHER engine, else null. `current` is the project's current engine.
 */
export function detectEngineSwitch(text: string, current: GameEngine): GameEngine | null {
  if (!text || !SWITCH_VERB.test(text)) return null;
  const wants3D = HAS_3D.test(text);
  const wants2D = HAS_2D.test(text);
  // Need an unambiguous single direction.
  const target: GameEngine | null = wants3D && !wants2D ? 'three' : wants2D && !wants3D ? 'phaser' : null;
  if (!target || target === current) return null;
  return target;
}
