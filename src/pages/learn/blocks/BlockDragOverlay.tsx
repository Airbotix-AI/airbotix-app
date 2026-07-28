import { createPortal } from 'react-dom'

import { BlockChip } from './BlockChip'
import { blockDef, type Block, type BlockOp } from './blocksModel'
import type { BlocksTheme } from './blocksTheme'

interface DraggedBlock {
  block: Block
}

interface BlockDragState {
  cx: number
  cy: number
  onBin: boolean
}

interface PaletteDragState {
  op: BlockOp
  n?: number
  cx: number
  cy: number
}

interface BlockDragOverlayProps {
  theme: BlocksTheme
  dragBlock: BlockDragState | null
  draggingBlock: DraggedBlock | null
  paletteBlock: PaletteDragState | null
}

export function BlockDragOverlay({
  theme,
  dragBlock,
  draggingBlock,
  paletteBlock,
}: BlockDragOverlayProps) {
  return (
    <>
      {dragBlock &&
        draggingBlock &&
        createPortal(
          <div
            className="bsx"
            data-theme={theme}
            style={{
              position: 'fixed',
              left: dragBlock.cx,
              top: dragBlock.cy,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%) scale(1.08) rotate(-2deg)',
            }}
          >
            <BlockChip block={draggingBlock.block} inChain removing={dragBlock.onBin} />
          </div>,
          document.body,
        )}

      {paletteBlock &&
        createPortal(
          <div
            className="bsx"
            data-theme={theme}
            style={{
              position: 'fixed',
              left: paletteBlock.cx,
              top: paletteBlock.cy,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%) scale(1.08) rotate(-2deg)',
            }}
          >
            <BlockChip
              block={{
                op: paletteBlock.op,
                ...(paletteBlock.n !== undefined
                  ? { n: paletteBlock.n }
                  : blockDef(paletteBlock.op).hasN
                    ? { n: blockDef(paletteBlock.op).defaultN }
                    : {}),
              }}
              inChain
            />
          </div>,
          document.body,
        )}
    </>
  )
}
