import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import {
  type BlockOp,
  type Script,
  isTrigger,
} from './blocksModel'
import { useBlocksStore } from './blocksStore'
import {
  LONGPRESS_MS,
  MOUSE_DRAG_PX,
  TOUCH_CANCEL_PX,
  lockTouchScroll,
  unlockTouchScroll,
} from './blocksStudioChrome'
import type { StoryMission } from './curriculumGuides'
import { sfx } from './sounds'
import { TINY_STAR_DUET_HOP_N } from './tinyStarDuet'
import type { ScanScriptRows } from './useBlockDrag'

interface UsePaletteDragOptions {
  running: boolean
  present: boolean
  readOnly: boolean
  scanRows: ScanScriptRows
  isA2DirectionDebug: boolean
  isA3EventDebug: boolean
  isA4ParameterBuild: boolean
  isA4ParameterDebug: boolean
  isA5RelayDebug: boolean
  isA6OrderDebug: boolean
  isA2PersonalShip: boolean
  isA4PersonalShip: boolean
  isA5PersonalShip: boolean
  storyMission?: StoryMission
  missionScript?: Script
}

export function usePaletteDrag({
  running,
  present,
  readOnly,
  scanRows,
  isA2DirectionDebug,
  isA3EventDebug,
  isA4ParameterBuild,
  isA4ParameterDebug,
  isA5RelayDebug,
  isA6OrderDebug,
  isA2PersonalShip,
  isA4PersonalShip,
  isA5PersonalShip,
  storyMission,
  missionScript,
}: UsePaletteDragOptions) {
  const paletteDrag = useRef<{
    op: BlockOp
    n?: number
    x0: number
    y0: number
    lastX: number
    lastY: number
    pointerId: number
    touch: boolean
    el: HTMLElement
  } | null>(null)
  const paletteLongPress = useRef<number | undefined>(undefined)
  const paletteDidDrag = useRef(false)
  const [paletteBlock, setPaletteBlock] = useState<{
    op: BlockOp
    n?: number
    cx: number
    cy: number
    scriptId: string | null
    slot: number
    dropX: number | null
  } | null>(null)
  const [ifBodyTarget, setIfBodyTarget] = useState<{
    scriptId: string
    index: number
  } | null>(null)

  const updatePaletteDrag = (x: number, y: number) => {
    const drag = paletteDrag.current
    if (!drag) return
    const hit = isTrigger(drag.op) ? null : scanRows(x, y)
    setPaletteBlock({
      op: drag.op,
      n: drag.n,
      cx: x,
      cy: y,
      scriptId: hit?.scriptId ?? null,
      slot: hit?.slot ?? 0,
      dropX: hit?.dropX ?? null,
    })
  }

  const onPaletteDown = (
    event: ReactPointerEvent,
    op: BlockOp,
    n?: number,
  ) => {
    if (running || present || readOnly) return
    const touch = event.pointerType === 'touch'
    const el = event.currentTarget as HTMLElement
    const { pointerId, clientX: x0, clientY: y0 } = event
    paletteDrag.current = {
      op,
      n,
      x0,
      y0,
      lastX: x0,
      lastY: y0,
      pointerId,
      touch,
      el,
    }
    paletteDidDrag.current = false
    window.clearTimeout(paletteLongPress.current)
    if (touch) {
      paletteLongPress.current = window.setTimeout(() => {
        const drag = paletteDrag.current
        if (!drag || paletteDidDrag.current) return
        paletteDidDrag.current = true
        sfx.pickup()
        try {
          drag.el.setPointerCapture(drag.pointerId)
        } catch {
          // Browser may release the pointer before the long press settles.
        }
        lockTouchScroll()
        navigator.vibrate?.(8)
        updatePaletteDrag(drag.lastX, drag.lastY)
      }, LONGPRESS_MS)
    }
  }

  const onPaletteMove = (event: ReactPointerEvent) => {
    const drag = paletteDrag.current
    if (!drag || event.pointerId !== drag.pointerId) return
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    if (!paletteDidDrag.current) {
      const moved = Math.hypot(event.clientX - drag.x0, event.clientY - drag.y0)
      if (drag.touch) {
        if (moved > TOUCH_CANCEL_PX) {
          window.clearTimeout(paletteLongPress.current)
          paletteDrag.current = null
        }
        return
      }
      if (moved <= MOUSE_DRAG_PX) return
      paletteDidDrag.current = true
      sfx.pickup()
      try {
        drag.el.setPointerCapture(drag.pointerId)
      } catch {
        // Pointer capture is best-effort.
      }
    }
    updatePaletteDrag(event.clientX, event.clientY)
  }

  const addPaletteBlock = (
    store: ReturnType<typeof useBlocksStore.getState>,
    op: BlockOp,
    n: number | undefined,
    drop?: { scriptId: string; slot: number },
  ) => {
    if (
      isA2DirectionDebug ||
      isA3EventDebug ||
      isA4ParameterBuild ||
      isA4ParameterDebug ||
      isA5RelayDebug
    ) {
      return
    }
    if (isA6OrderDebug) return
    if (ifBodyTarget && !isTrigger(op)) {
      store.addIfBodyBlock(ifBodyTarget.scriptId, ifBodyTarget.index, op, n)
      setIfBodyTarget(null)
      return
    }
    const isRouteChoice =
      (storyMission?.lessonId === 'tsv-s1-a2-b' ||
        isA2PersonalShip ||
        isA4PersonalShip) &&
      (op === 'move_left' || op === 'move_right')
    if (isRouteChoice && missionScript) {
      const endIndex = missionScript.blocks.findIndex((block) => block.op === 'end')
      store.insertBlock(
        op,
        missionScript.id,
        endIndex >= 1 ? endIndex : missionScript.blocks.length,
        isA2PersonalShip || isA4PersonalShip ? 1 : 3,
      )
      return
    }
    const seededN =
      isA5PersonalShip && op === 'hop' ? TINY_STAR_DUET_HOP_N : n
    if (drop) {
      store.insertBlock(op, drop.scriptId, drop.slot, seededN)
      return
    }
    store.addBlock(op, seededN)
  }

  const endPaletteDrag = (
    op: BlockOp,
    n: number | undefined,
    commit: boolean,
  ) => {
    window.clearTimeout(paletteLongPress.current)
    unlockTouchScroll()
    const info = paletteBlock
    const drag = paletteDrag.current
    paletteDrag.current = null
    setPaletteBlock(null)
    const store = useBlocksStore.getState()
    if (commit) {
      if (paletteDidDrag.current) {
        if (info?.scriptId) {
          sfx.snap()
          addPaletteBlock(store, drag?.op ?? op, drag?.n ?? n, {
            scriptId: info.scriptId,
            slot: info.slot,
          })
        } else {
          sfx.place()
          addPaletteBlock(store, drag?.op ?? op, drag?.n ?? n)
        }
      } else {
        sfx.place()
        addPaletteBlock(store, op, n)
      }
    }
    setTimeout(() => {
      paletteDidDrag.current = false
    }, 0)
  }

  useEffect(
    () => () => {
      window.clearTimeout(paletteLongPress.current)
      unlockTouchScroll()
    },
    [],
  )

  return {
    paletteBlock,
    ifBodyTarget,
    setIfBodyTarget,
    onPaletteDown,
    onPaletteMove,
    onPaletteUp: (op: BlockOp, n?: number) => endPaletteDrag(op, n, true),
    onPaletteCancel: (op: BlockOp, n?: number) => endPaletteDrag(op, n, false),
  }
}
