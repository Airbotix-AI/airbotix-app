// One puzzle-piece block (palette tile AND chained program piece). The visual
// construction (masked socket + glossy plug, validated in the PRD mockup)
// lives in blocks.css; this maps a Block/BlockDef onto it.

import type { CSSProperties, MouseEvent, PointerEvent } from 'react';
import clsx from 'clsx';

import { type Block, blockDef, isTrigger } from './blocksModel';

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
        dragging && 'dragging',
        removing && 'removing',
      )}
    >
      <span className="bd" />
      {!noPlug && <span className="plug" />}
      <span className="ic">{def.icon}</span>
      {block.op === 'say' ? (block.text ?? 'Hi!').slice(0, 8) : def.label}
      {def.hasN && (
        // display-only — tapping anywhere on the block opens the editor
        <span className="num" data-testid="block-num">
          {block.n ?? def.defaultN ?? 1}
        </span>
      )}
    </button>
  );
}
