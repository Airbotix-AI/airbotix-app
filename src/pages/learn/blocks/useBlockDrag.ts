import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import { type BlockPath, type Character, blockAtPath } from './blocksModel'
import {
  type DropHit,
  isNoopDrop,
  scanDropZones,
} from './blockDropZones'
import { useBlocksStore } from './blocksStore'
import {
  LONGPRESS_MS,
  MOUSE_DRAG_PX,
  TOUCH_CANCEL_PX,
  lockTouchScroll,
  unlockTouchScroll,
} from './blocksStudioChrome'
import { sfx } from './sounds'

interface UseBlockDragOptions {
  running: boolean
  present: boolean
  readOnly: boolean
  isA2DirectionDebug: boolean
  isA3EventDebug: boolean
  isA4ParameterBuild: boolean
  isA4ParameterDebug: boolean
  isA5RelayDebug: boolean
  isA6OrderDebug: boolean
  missionWrongRunObserved: boolean
  selectedChar: Character
}

export function useBlockDrag({
  running,
  present,
  readOnly,
  isA2DirectionDebug,
  isA3EventDebug,
  isA4ParameterBuild,
  isA4ParameterDebug,
  isA5RelayDebug,
  isA6OrderDebug,
  missionWrongRunObserved,
  selectedChar,
}: UseBlockDragOptions) {
  const binRef = useRef<HTMLDivElement>(null)
  const [binArmed, setBinArmed] = useState(false)
  const blockDrag = useRef<{
    scriptId: string
    path: number[]
    x0: number
    y0: number
    lastX: number
    lastY: number
    pointerId: number
    touch: boolean
    el: HTMLElement
  } | null>(null)
  const blockLP = useRef<number | undefined>(undefined)
  const blockDidDrag = useRef(false)
  const [dragBlk, setDragBlk] = useState<{
    scriptId: string
    path: number[]
    cx: number
    cy: number
    onBin: boolean
    target: DropHit | null
  } | null>(null)

  const scanRows = scanDropZones

  const overBin = (x: number, y: number) => {
    const rect = binRef.current?.getBoundingClientRect()
    if (!rect) return false
    const pad = 16
    return (
      x >= rect.left - pad &&
      x <= rect.right + pad &&
      y >= rect.top - pad &&
      y <= rect.bottom + pad
    )
  }

  /** The trigger anchors its track and never moves. */
  const isTriggerDrag = (path: BlockPath) => path.length === 1 && path[0] === 0

  const blockDragUpdate = (x: number, y: number) => {
    const drag = blockDrag.current
    if (!drag) return
    const onBin = overBin(x, y)
    setBinArmed(onBin)
    const target =
      !onBin && !isTriggerDrag(drag.path)
        ? scanDropZones(x, y, { scriptId: drag.scriptId, path: drag.path })
        : null
    setDragBlk({
      scriptId: drag.scriptId,
      path: drag.path,
      cx: x,
      cy: y,
      onBin,
      target,
    })
  }

  const onBlockDown = (
    event: ReactPointerEvent,
    scriptId: string,
    path: number[],
  ) => {
    if (
      running ||
      present ||
      readOnly ||
      isA2DirectionDebug ||
      isA3EventDebug ||
      isA4ParameterBuild ||
      isA4ParameterDebug ||
      isA5RelayDebug
    ) {
      return
    }
    if (isA6OrderDebug && !missionWrongRunObserved) return
    const touch = event.pointerType === 'touch'
    const el = event.currentTarget as HTMLElement
    const { pointerId, clientX: x0, clientY: y0 } = event
    blockDrag.current = {
      scriptId,
      path,
      x0,
      y0,
      lastX: x0,
      lastY: y0,
      pointerId,
      touch,
      el,
    }
    blockDidDrag.current = false
    window.clearTimeout(blockLP.current)
    if (touch) {
      blockLP.current = window.setTimeout(() => {
        const drag = blockDrag.current
        if (!drag || blockDidDrag.current) return
        blockDidDrag.current = true
        sfx.pickup()
        try {
          drag.el.setPointerCapture(drag.pointerId)
        } catch {
          // Browser may release the pointer before the long press settles.
        }
        lockTouchScroll()
        navigator.vibrate?.(8)
        blockDragUpdate(drag.lastX, drag.lastY)
      }, LONGPRESS_MS)
    }
  }

  const onBlockMove = (event: ReactPointerEvent) => {
    const drag = blockDrag.current
    if (!drag || event.pointerId !== drag.pointerId) return
    drag.lastX = event.clientX
    drag.lastY = event.clientY
    if (!blockDidDrag.current) {
      const moved = Math.hypot(event.clientX - drag.x0, event.clientY - drag.y0)
      if (drag.touch) {
        if (moved > TOUCH_CANCEL_PX) {
          window.clearTimeout(blockLP.current)
          blockDrag.current = null
        }
        return
      }
      if (moved <= MOUSE_DRAG_PX) return
      blockDidDrag.current = true
      sfx.pickup()
      try {
        drag.el.setPointerCapture(drag.pointerId)
      } catch {
        // Pointer capture is best-effort.
      }
    }
    blockDragUpdate(event.clientX, event.clientY)
  }

  const endBlockDrag = (commit: boolean) => {
    window.clearTimeout(blockLP.current)
    unlockTouchScroll()
    const info = dragBlk
    const drag = blockDrag.current
    // Re-scan at the release point: a pointer can move between the last render
    // and pointerup, and the committed drop must match what the child saw.
    const finalHit =
      drag && !info?.onBin && !isTriggerDrag(drag.path)
        ? scanDropZones(drag.lastX, drag.lastY, {
            scriptId: drag.scriptId,
            path: drag.path,
          })
        : null
    const target = finalHit ?? info?.target ?? null
    blockDrag.current = null
    setDragBlk(null)
    setBinArmed(false)
    if (commit && blockDidDrag.current && info && drag) {
      if (info.onBin) {
        sfx.trash()
        useBlocksStore.getState().removeBlockAtPath(drag.scriptId, drag.path)
      } else if (
        target &&
        !(target.scriptId === drag.scriptId && isNoopDrop(drag.path, target.path))
      ) {
        sfx.snap()
        useBlocksStore
          .getState()
          .moveBlockToPath(drag.scriptId, drag.path, target.scriptId, target.path)
      }
    }
    setTimeout(() => {
      blockDidDrag.current = false
    }, 0)
  }

  useEffect(
    () => () => {
      window.clearTimeout(blockLP.current)
      unlockTouchScroll()
    },
    [],
  )

  const draggingBlock = (() => {
    if (!dragBlk) return null
    const script = selectedChar.scripts.find((item) => item.id === dragBlk.scriptId)
    const block = script ? blockAtPath(script.blocks, dragBlk.path) : undefined
    return block ? { block } : null
  })()

  return {
    binRef,
    binArmed,
    blockDidDrag,
    dragBlk,
    draggingBlock,
    scanRows,
    onBlockDown,
    onBlockMove,
    onBlockUp: () => endBlockDrag(true),
    onBlockCancel: () => endBlockDrag(false),
  }
}
