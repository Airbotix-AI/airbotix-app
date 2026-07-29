// One chain of blocks inside a drop zone — a whole track, or the body of a
// C-block. It renders itself recursively, so nesting depth costs the editor
// nothing, and it is the single place that draws the DROP GAP: while a block is
// being dragged, the chain physically opens a block-sized hole at the slot the
// block would land in, and the owning zone lights up. That is what makes
// "drag it inside the If" readable to a five-year-old (learn-blocks-studio-prd
// §7, D-BLK-13).

import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'

import { BlockChip } from './BlockChip'
import {
  type Block,
  type BlockPath,
  blockDef,
  isContainer,
  pathToKey,
  samePath,
} from './blocksModel'
import type { StoryMission } from './curriculumGuides'
import { sfx } from './sounds'
import { type DropHit, dropSlotInZone, zoneHoldsDrop } from './blockDropZones'

export interface ChainContext {
  scriptId: string
  activeKeys: Set<string>
  /** The block currently under the finger (so its origin can fade out). */
  dragging: { scriptId: string; path: BlockPath } | null
  /** Where the dragged / palette block would land right now. */
  dropTarget: DropHit | null
  ifBodyTarget: { scriptId: string; index: number } | null
  setIfBodyTarget: (target: { scriptId: string; index: number }) => void
  onBlockDown: (event: ReactPointerEvent, scriptId: string, path: number[]) => void
  onBlockMove: (event: ReactPointerEvent) => void
  onBlockUp: () => void
  onBlockCancel: () => void
  onBlockTap: (
    event: ReactMouseEvent,
    scriptId: string,
    path: number[],
    op: string,
  ) => void
  storyMission?: StoryMission
  isA2DirectionDebug: boolean
  missionWrongRunObserved: boolean
}

function blockTitle(
  block: Block,
  ctx: ChainContext,
  nested: boolean,
): string {
  const def = blockDef(block.op)
  const isLockedDirection =
    ctx.storyMission?.lessonId === 'tsv-s1-a2-b' &&
    (block.op === 'move_left' || block.op === 'move_right')
  const isDebugDirection =
    ctx.isA2DirectionDebug && (block.op === 'move_left' || block.op === 'move_right')
  if (isDebugDirection) {
    return ctx.missionWrongRunObserved
      ? 'Tap to turn this one arrow · 3 steps stay the same'
      : 'Press Go first and watch where Left 3 goes'
  }
  if (isLockedDirection) return '3 steps are ready · hold to drag · drag to the bin to remove'
  const drag = nested
    ? 'hold to drag it out · drag to the bin to remove'
    : 'hold to drag · drag to the bin to remove'
  if (def.hasN) return `Tap to change the number · ${drag}`
  if (block.op === 'say') return `Tap to change the words · ${drag}`
  return nested ? 'Hold to drag it out of the If · drag to the bin' : 'Hold to drag · drag to another track or the bin'
}

interface BlockChainProps {
  blocks: Block[]
  /** [] for a track, or the path of the C-block that owns this body. */
  zonePath: number[]
  ctx: ChainContext
}

export function BlockChain({ blocks, zonePath, ctx }: BlockChainProps) {
  const { scriptId } = ctx
  const dropSlot = dropSlotInZone(ctx.dropTarget, scriptId, zonePath)
  const nested = zonePath.length > 0
  const rendered: JSX.Element[] = []

  const gap = (key: string) => (
    <span key={key} className="bsx-dropslot" data-testid="drop-slot" aria-hidden />
  )

  blocks.forEach((block, i) => {
    const path = [...zonePath, i]
    const key = `${scriptId}-${pathToKey(path)}`
    if (dropSlot === i) rendered.push(gap(`gap-${key}`))
    const isDragged =
      !!ctx.dragging &&
      ctx.dragging.scriptId === scriptId &&
      samePath(ctx.dragging.path, path)
    const chipProps = {
      block,
      inChain: true as const,
      isLast: i === blocks.length - 1,
      lit: !nested && ctx.activeKeys.has(`${scriptId}:${i}`),
      dragging: isDragged,
      style: isDragged ? { opacity: 0.28 } : undefined,
      onPointerDown: (event: ReactPointerEvent) => ctx.onBlockDown(event, scriptId, path),
      onPointerMove: ctx.onBlockMove,
      onPointerUp: ctx.onBlockUp,
      onPointerCancel: ctx.onBlockCancel,
      onTap: (event: ReactMouseEvent) => ctx.onBlockTap(event, scriptId, path, block.op),
      dataPath: pathToKey(path),
    }

    if (isContainer(block.op)) {
      const armed =
        ctx.ifBodyTarget?.scriptId === scriptId &&
        zonePath.length === 0 &&
        ctx.ifBodyTarget.index === i
      const bodyHoldsDrop = zoneHoldsDrop(ctx.dropTarget, scriptId, path)
      rendered.push(
        <div
          key={key}
          className={`bsx-if-c${isDragged ? ' is-lifted' : ''}`}
          data-testid="if-container"
          data-block-path={pathToKey(path)}
        >
          <BlockChip
            {...chipProps}
            isLast={false}
            dataPath={undefined}
            title="Tap to choose a friend · hold to move the whole If"
          />
          <div
            className={`bsx-if-body${armed || bodyHoldsDrop ? ' is-target' : ''}`}
            data-testid="if-body"
          >
            <span className="bsx-if-body-label">Then do</span>
            <div
              className="bsx-if-body-chain"
              data-drop-zone={scriptId}
              data-zone-path={pathToKey(path)}
            >
              <BlockChain blocks={block.body ?? []} zonePath={path} ctx={ctx} />
              {(block.body?.length ?? 0) === 0 && dropSlotInZone(ctx.dropTarget, scriptId, path) === null && (
                <span className="bsx-if-empty" data-testid="if-body-empty">
                  Drop a block here
                </span>
              )}
            </div>
            {zonePath.length === 0 && (
              <button
                type="button"
                className="bsx-if-add"
                data-testid="if-add-inside"
                aria-pressed={armed}
                onClick={() => {
                  sfx.tap()
                  ctx.setIfBodyTarget({ scriptId, index: i })
                }}
              >
                <span aria-hidden>{armed ? '←' : '+'}</span>
                {armed ? 'Pick a block on the left' : 'Add block'}
              </button>
            )}
          </div>
          <span className="bsx-if-foot" aria-hidden />
        </div>,
      )
      return
    }

    rendered.push(
      <BlockChip key={key} {...chipProps} title={blockTitle(block, ctx, nested)} />,
    )
  })

  if (dropSlot !== null && dropSlot >= blocks.length) rendered.push(gap('gap-end'))
  return <>{rendered}</>
}
