import type { BlockOp } from './blocksModel';

export type CharacterPerformance =
  | 'idle'
  | 'listening'
  | 'moving'
  | 'hopping'
  | 'speaking'
  | 'thinking'
  | 'success'
  | 'resting';

const MOVING_OPS: readonly BlockOp[] = [
  'move_right',
  'move_left',
  'move_up',
  'move_down',
  'turn_right',
  'turn_left',
  'go_home',
];

export function performanceForBlock(op?: BlockOp): CharacterPerformance {
  if (op === 'hop') return 'hopping';
  if (op === 'say') return 'speaking';
  if (MOVING_OPS.includes(op as BlockOp)) return 'moving';
  if (op === 'stop') return 'thinking';
  if (op) return 'listening';
  return 'idle';
}
