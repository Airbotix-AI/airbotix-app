import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  Ref,
} from 'react'

import { BlockChip } from './BlockChip'
import { FadeScroller } from './FadeScroller'
import { ZoneTag } from './ZoneTag'
import { READONLY_EDIT_DISABLED } from './blocksStudioChrome'
import {
  BLOCK_DEFS,
  BUILT_IN_NOTES,
  BUILT_IN_SOUNDS,
  CATEGORIES,
  blockDef,
  defaultParam,
  type BlockCategory,
  type BlockOp,
  type Character,
} from './blocksModel'
import { useBlocksStore } from './blocksStore'
import type { StoryMission } from './curriculumGuides'
import { sfx } from './sounds'

interface DragBlock {
  scriptId: string
  index: number
  onBin: boolean
  targetScriptId: string | null
  dropX: number | null
}

interface PaletteDragBlock {
  op: BlockOp
  n?: number
  scriptId: string | null
  dropX: number | null
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
  onBlockDown: (event: ReactPointerEvent, scriptId: string, index: number) => void
  onBlockMove: (event: ReactPointerEvent) => void
  onBlockUp: () => void
  onBlockCancel: () => void
  onBlockTap: (
    event: ReactMouseEvent,
    scriptId: string,
    index: number,
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
    (definition) => definition.category === category && !definition.legacy,
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
                const isDragSource = !!dragBlock && dragBlock.scriptId === script.id
                const showReorderBar =
                  !!dragBlock &&
                  !dragBlock.onBin &&
                  dragBlock.targetScriptId === script.id &&
                  dragBlock.dropX !== null
                return (
                  <div
                    key={script.id}
                    className="bsx-chainwrap relative mb-3 flex w-max items-center rounded-2xl p-2.5 pr-4"
                    data-testid={`script-${script.id}`}
                  >
                    {script.blocks.map((b, i) => {
                      const isDragged = isDragSource && dragBlock!.index === i
                      const def = blockDef(b.op)
                      const isLockedDirection =
                        storyMission?.lessonId === 'tsv-s1-a2-b' &&
                        (b.op === 'move_left' || b.op === 'move_right')
                      const isDebugDirection =
                        isA2DirectionDebug && (b.op === 'move_left' || b.op === 'move_right')
                      if (b.op === 'if_touching') {
                        const bodyTarget =
                          ifBodyTarget?.scriptId === script.id && ifBodyTarget.index === i
                        return (
                          <div
                            key={`${script.id}-${i}`}
                            className="bsx-if-c"
                            data-testid="if-container"
                          >
                            <BlockChip
                              block={b}
                              inChain
                              lit={activeKeys.has(`${script.id}:${i}`)}
                              dragging={isDragged}
                              style={isDragged ? { opacity: 0.28 } : undefined}
                              onPointerDown={(e) => onBlockDown(e, script.id, i)}
                              onPointerMove={onBlockMove}
                              onPointerUp={onBlockUp}
                              onPointerCancel={onBlockCancel}
                              onTap={(e) => onBlockTap(e, script.id, i, b.op)}
                              title="Tap to choose a friend · hold to move the whole If"
                            />
                            <div
                              className={`bsx-if-body${bodyTarget ? ' is-target' : ''}`}
                              data-testid="if-body"
                            >
                              <span className="bsx-if-body-label">Then do</span>
                              <div className="bsx-if-body-chain">
                                {(b.body ?? []).map((child, bodyIndex) => (
                                  <BlockChip
                                    key={`${script.id}-${i}-body-${bodyIndex}`}
                                    block={child}
                                    inChain
                                    isLast={bodyIndex === (b.body?.length ?? 0) - 1}
                                    title="Tap to remove this action from the If"
                                    onTap={() =>
                                      useBlocksStore
                                        .getState()
                                        .removeIfBodyBlock(script.id, i, bodyIndex)
                                    }
                                  />
                                ))}
                              </div>
                              <button
                                type="button"
                                className="bsx-if-add"
                                data-testid="if-add-inside"
                                aria-pressed={bodyTarget}
                                onClick={() => {
                                  sfx.tap()
                                  setIfBodyTarget({ scriptId: script.id, index: i })
                                }}
                              >
                                <span aria-hidden>{bodyTarget ? '←' : '+'}</span>
                                {bodyTarget ? 'Pick a block on the left' : 'Add block'}
                              </button>
                            </div>
                            <span className="bsx-if-foot" aria-hidden />
                          </div>
                        )
                      }
                      return (
                        <BlockChip
                          key={`${script.id}-${i}`}
                          block={b}
                          inChain
                          isLast={i === script.blocks.length - 1}
                          lit={activeKeys.has(`${script.id}:${i}`)}
                          dragging={isDragged}
                          style={isDragged ? { opacity: 0.28 } : undefined}
                          onPointerDown={(e) => onBlockDown(e, script.id, i)}
                          onPointerMove={onBlockMove}
                          onPointerUp={onBlockUp}
                          onPointerCancel={onBlockCancel}
                          onTap={(e) => onBlockTap(e, script.id, i, b.op)}
                          title={
                            isDebugDirection
                              ? missionWrongRunObserved
                                ? 'Tap to turn this one arrow · 3 steps stay the same'
                                : 'Press Go first and watch where Left 3 goes'
                              : isLockedDirection
                                ? '3 steps are ready · hold to drag · drag to the bin to remove'
                                : def.hasN
                                  ? 'Tap to change the number · hold to drag · drag to the bin to remove'
                                  : b.op === 'say'
                                    ? 'Tap to change the words · hold to drag · drag to the bin to remove'
                                    : 'Hold to drag · drag to another track or the bin'
                          }
                        />
                      )
                    })}
                    {showReorderBar && (
                      <span className="bsx-dropbar" style={{ left: dragBlock!.dropX! }} />
                    )}
                    {paletteBlock &&
                      paletteBlock.scriptId === script.id &&
                      paletteBlock.dropX !== null && (
                      <span className="bsx-dropbar" style={{ left: paletteBlock.dropX }} />
                    )}
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
