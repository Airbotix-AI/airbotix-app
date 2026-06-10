// One puzzle-piece block (palette tile AND chained program piece). The visual
// construction (masked socket + glossy plug, validated in the PRD mockup)
// lives in blocks.css; this maps a Block/BlockDef onto it.

import clsx from 'clsx';

import { type Block, blockDef, isTrigger } from './blocksModel';

export function BlockChip({
  block,
  inChain,
  isLast,
  lit,
  onTap,
  onTapNum,
  title,
}: {
  block: Block;
  /** Chained pieces hide the socket gap; the chain's last piece drops its plug. */
  inChain?: boolean;
  isLast?: boolean;
  lit?: boolean;
  onTap?: () => void;
  onTapNum?: () => void;
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
      className={clsx(
        'bsx-block',
        `cat-${def.category}`,
        isTrigger(block.op) && 'is-trigger',
        noPlug && 'no-plug',
        def.hasN && 'has-num',
        lit && 'lit',
      )}
    >
      <span className="bd" />
      {!noPlug && <span className="plug" />}
      <span className="ic">{def.icon}</span>
      {block.op === 'say' ? (block.text ?? 'Hi!').slice(0, 8) : def.label}
      {def.hasN && (
        <span
          className="num"
          data-testid="block-num"
          onClick={(e) => {
            if (!onTapNum) return;
            e.stopPropagation();
            onTapNum();
          }}
        >
          {block.n ?? def.defaultN ?? 1}
        </span>
      )}
    </button>
  );
}
