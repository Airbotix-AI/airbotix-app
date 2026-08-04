import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  Ref,
} from 'react'

import { BlockChain, type ChainContext } from './BlockChain'
import { zoneHoldsDrop } from './blockDropZones'
import { BlockChip } from './BlockChip'
import { FadeScroller } from './FadeScroller'
import { ZoneTag } from './ZoneTag'
import { READONLY_EDIT_DISABLED } from './blocksStudioChrome'
import {
  BLOCK_DEFS,
  BUILT_IN_NOTES,
  BUILT_IN_SOUNDS,
  CATEGORIES,
  defaultParam,
  type BlockCategory,
  type BlockOp,
  type Character,
} from './blocksModel'
import type { StoryMission } from './curriculumGuides'
import { sfx } from './sounds'
import type { DropHit } from './blockDropZones'

interface DragBlock {
  scriptId: string
  path: number[]
  onBin: boolean
  target: DropHit | null
}

interface PaletteDragBlock {
  op: BlockOp
  n?: number
  target: DropHit | null
}

interface BlocksCodingBandProps {
  readOnly: boolean
  category: BlockCategory
  setCategory: (category: BlockCategory) => void
  paletteBlock: PaletteDragBlock | null
  selectedChar: Character
  onPaletteDown: (event: ReactPointerEvent, op: BlockOp, n?: number) => void
  onPaletteMove: (event: ReactPointerEvent) => void
  onPaletteUp: (op: BlockOp, n?: number) => void
  onPaletteCancel: (op: BlockOp, n?: number) => void
  dragBlock: DragBlock | null
  ifBodyTarget: { scriptId: string; index: number } | null
  setIfBodyTarget: (target: { scriptId: string; index: number }) => void
  activeKeys: Set<string>
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
  binRef: Ref<HTMLDivElement>
  binArmed: boolean
}

export function BlocksCodingBand({
  readOnly,
  category,
  setCategory,
  paletteBlock,
  selectedChar,
  onPaletteDown,
  onPaletteMove,
  onPaletteUp,
  onPaletteCancel,
  dragBlock,
  ifBodyTarget,
  setIfBodyTarget,
  activeKeys,
  onBlockDown,
  onBlockMove,
  onBlockUp,
  onBlockCancel,
  onBlockTap,
  storyMission,
  isA2DirectionDebug,
  missionWrongRunObserved,
  binRef,
  binArmed,
}: BlocksCodingBandProps) {
  const paletteBlocks = BLOCK_DEFS.filter(
    (definition) =>
      definition.category === category &&
      !definition.legacy &&
      (!storyMission?.allowedOps || storyMission.allowedOps.includes(definition.op)),
  )
  const paletteChoices: Array<{
    def: (typeof paletteBlocks)[number]
    n?: number
    key: string
  }> = []
  paletteBlocks.forEach((definition) => {
    if (definition.param === 'note') {
      BUILT_IN_NOTES.forEach((note) => {
        paletteChoices.push({
          def: definition,
          n: note.id,
          key: `${definition.op}-${note.id}`,
        })
      })
      return
    }
    if (definition.param === 'sound') {
      BUILT_IN_SOUNDS.forEach((sound) => {
        paletteChoices.push({
          def: definition,
          n: sound.id,
          key: `${definition.op}-${sound.id}`,
        })
      })
      return
    }
    paletteChoices.push({
      def: definition,
      n: defaultParam(definition.op),
      key: definition.op,
    })
  })
  const activeCategory =
    CATEGORIES.find((item) => item.id === category) ?? CATEGORIES[0]

  return (
    <section className="bsx-coder">
      <nav
        className={`bsx-catbar${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
        aria-label="Kinds of blocks"
        aria-disabled={readOnly || undefined}
      >
        <FadeScroller className="bsx-catscroll">
          <ZoneTag zone="cats" emoji="🧰" label="Kinds" />
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              data-testid={`cat-${c.id}`}
              className={`bsx-cat c-${c.id}`}
              aria-pressed={category === c.id}
              disabled={readOnly}
              aria-disabled={readOnly || undefined}
              onClick={() => {
                if (readOnly) return
                sfx.tap()
                setCategory(c.id)
              }}
              title={`${c.label} blocks`}
            >
              <span>{c.icon}</span>
              {c.id === 'sound' && (
                <span className="bsx-cat-count" aria-hidden>
                  7+6
                </span>
              )}
            </button>
          ))}
        </FadeScroller>
      </nav>

      <div className="relative flex min-h-0 min-w-0 flex-col gap-2">
        <ZoneTag zone="palette" emoji="🧩" label="Blocks" />
        <div
          className={`bsx-soft bsx-palette flex min-w-0 overflow-hidden rounded-3xl${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
          data-testid="palette"
          data-cat={category}
          aria-label="Blocks"
          aria-disabled={readOnly || undefined}
        >
          <FadeScroller className="flex items-center gap-4 overflow-x-auto px-4 pb-4 pt-3">
            <span className="bsx-palette-tag shrink-0">
              <span aria-hidden>{activeCategory.icon}</span>
              {activeCategory.id === 'sound' ? '7 Notes + 6 Sounds' : activeCategory.label}
            </span>
            {paletteChoices.map(({ def, n, key }) => (
              <BlockChip
                key={key}
                block={{
                  op: def.op,
                  ...(n !== undefined ? { n } : {}),
                }}
                style={
                  paletteBlock?.op === def.op && paletteBlock?.n === n
                    ? { opacity: 0.4 }
                    : undefined
                }
                onPointerDown={(e) => onPaletteDown(e, def.op, n)}
                onPointerMove={onPaletteMove}
                onPointerUp={() => onPaletteUp(def.op, n)}
                onPointerCancel={() => onPaletteCancel(def.op, n)}
                title={`Tap to add this sound — or hold and drag it into ${selectedChar?.name}'s program`}
              />
            ))}
          </FadeScroller>
        </div>

        <div className="relative flex min-h-0 flex-1 gap-2">
          <ZoneTag zone="script" emoji="✨" label="What they do" />
          <div
            className="bsx-soft relative flex min-h-0 flex-1 overflow-hidden rounded-3xl"
            data-testid="script-area"
            aria-label="What they do"
          >
            <FadeScroller className="overflow-auto p-4">
              {selectedChar?.scripts.length === 0 && (
                <div className="bsx-muted grid h-full place-items-center text-[14px] font-bold">
                  Tap a 🚩 block to pick what {selectedChar.name} does ✨
                </div>
              )}
              {selectedChar?.scripts.map((script) => {
                const dropTarget = dragBlock
                  ? dragBlock.onBin
                    ? null
                    : dragBlock.target
                  : (paletteBlock?.target ?? null)
                const chainCtx: ChainContext = {
                  scriptId: script.id,
                  activeKeys,
                  dragging: dragBlock
                    ? { scriptId: dragBlock.scriptId, path: dragBlock.path }
                    : null,
                  dropTarget,
                  ifBodyTarget,
                  setIfBodyTarget,
                  onBlockDown,
                  onBlockMove,
                  onBlockUp,
                  onBlockCancel,
                  onBlockTap,
                  storyMission,
                  isA2DirectionDebug,
                  missionWrongRunObserved,
                }
                // The track glows whenever the drop lands anywhere inside it,
                // including inside a nested C-block body.
                const isDropTrack = zoneHoldsDrop(dropTarget, script.id, [])
                return (
                  <div
                    key={script.id}
                    className={`bsx-chainwrap relative mb-3 flex w-max items-center rounded-2xl p-2.5 pr-4${
                      isDropTrack ? ' is-drop-target' : ''
                    }`}
                    data-testid={`script-${script.id}`}
                    data-drop-zone={script.id}
                    data-zone-path=""
                  >
                    <BlockChain blocks={script.blocks} zonePath={[]} ctx={chainCtx} />
                  </div>
                )
              })}
            </FadeScroller>
          </div>
          <div
            ref={binRef}
            data-testid="trash-bin"
            aria-label="Trash"
            aria-disabled={readOnly || undefined}
            className={`bsx-bin${dragBlock ? ' active' : ''}${binArmed ? ' armed' : ''}${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
          >
            <div className="bsx-bin-can">
              <span className="bsx-bin-lid" />
              <span className="bsx-bin-body" />
            </div>
            <span className="bsx-bin-label">{binArmed ? 'Drop!' : 'Bin'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
