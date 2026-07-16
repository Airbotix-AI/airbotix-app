// One puzzle-piece block (palette tile AND chained program piece). The visual
// construction (masked socket + glossy plug, validated in the PRD mockup)
// lives in blocks.css; this maps a Block/BlockDef onto it.

import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import clsx from 'clsx';

import {
  BUILT_IN_NOTES,
  BUILT_IN_SOUNDS,
  type Block,
  MESSAGE_COLORS,
  SPEED_ICONS,
  blockDef,
  isTrigger,
} from './blocksModel';

const clampIdx = (i: number, max: number) => Math.min(max, Math.max(0, i));

export function BlockChip({
  block,
  inChain,
  isLast,
  lit,
  dragging,
  removing,
  style,
  onTap,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  title,
}: {
  block: Block;
  /** Chained pieces hide the socket gap; the chain's last piece drops its plug. */
  inChain?: boolean;
  isLast?: boolean;
  lit?: boolean;
  /** This chained block is being dragged (follows the pointer). */
  dragging?: boolean;
  /** Dragged far enough that letting go removes it (red "will delete" cue). */
  removing?: boolean;
  style?: CSSProperties;
  onTap?: (e: MouseEvent) => void;
  onPointerDown?: (e: PointerEvent) => void;
  onPointerMove?: (e: PointerEvent) => void;
  onPointerUp?: (e: PointerEvent) => void;
  onPointerCancel?: (e: PointerEvent) => void;
  title?: string;
}) {
  const def = blockDef(block.op);
  const noPlug = def.category === 'end' || (inChain && isLast);
  // Set Speed shows its current pace glyph; message blocks show their colour tag.
  const sound = def.param === 'sound'
    ? BUILT_IN_SOUNDS[clampIdx((block.n ?? 1) - 1, BUILT_IN_SOUNDS.length - 1)]
    : null;
  const note = def.param === 'note'
    ? BUILT_IN_NOTES[clampIdx((block.n ?? 1) - 1, BUILT_IN_NOTES.length - 1)]
    : null;
  const icon = def.param === 'speed'
    ? SPEED_ICONS[clampIdx((block.n ?? 2) - 1, SPEED_ICONS.length - 1)]
    : note?.icon ?? sound?.icon ?? def.icon;
  const msgColor = def.param === 'color' ? MESSAGE_COLORS[clampIdx((block.n ?? 1) - 1, MESSAGE_COLORS.length - 1)] : null;
  return (
    <button
      type="button"
      data-testid={`block-${block.op}`}
      title={title}
      onClick={onTap}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      style={style}
      className={clsx(
        'bsx-block',
        `cat-${def.category}`,
        isTrigger(block.op) && 'is-trigger',
        noPlug && 'no-plug',
        def.hasN && 'has-num',
        lit && 'lit',
        inChain && 'in-chain',
        block.op === 'if_touching' && 'if-open',
        block.op === 'end_if' && 'if-close',
        dragging && 'dragging',
        removing && 'removing',
      )}
    >
      <span className="bd" />
      {!noPlug && <span className="plug" />}
      <span className="ic">{icon}</span>
      {block.op === 'say'
        ? (block.text ?? 'Hi!').slice(0, 8)
        : block.op === 'if_touching'
          ? block.text
            ? 'If touch ✓ then'
            : 'If touch ? then'
          : block.op === 'end_if'
            ? 'End if'
          : note?.label ?? sound?.label ?? def.label}
      {def.hasN && (
        // display-only — tapping anywhere on the block opens the editor
        <span className="num" data-testid="block-num">
          {block.n ?? def.defaultN ?? 1}
        </span>
      )}
      {msgColor && (
        // tap the block to cycle the message colour
        <span className="bsx-msgdot" data-testid="block-color" style={{ background: msgColor }} />
      )}
    </button>
  );
}
