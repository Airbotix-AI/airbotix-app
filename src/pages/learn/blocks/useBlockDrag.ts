import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

import type { Character } from './blocksModel'
import { useBlocksStore } from './blocksStore'
import {
  LONGPRESS_MS,
  MOUSE_DRAG_PX,
  TOUCH_CANCEL_PX,
  lockTouchScroll,
  unlockTouchScroll,
} from './blocksStudioChrome'
import { sfx } from './sounds'

export interface ScriptRowHit {
  scriptId: string
  slot: number
  dropX: number
}

export type ScanScriptRows = (
  x: number,
  y: number,
  exclude?: { scriptId: string; index: number },
) => ScriptRowHit | null

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
    index: number
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
    index: number
    cx: number
    cy: number
    onBin: boolean
    targetScriptId: string | null
    targetSlot: number | null
    dropX: number | null
  } | null>(null)

  const scanRows: ScanScriptRows = (x, y, exclude) => {
    const rows = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-testid^="script-"]:not([data-testid="script-area"])',
      ),
    ]
    for (const row of rows) {
      const rowRect = row.getBoundingClientRect()
      const pad = 18
      if (
        x < rowRect.left - pad ||
        x > rowRect.right + pad ||
        y < rowRect.top - pad ||
        y > rowRect.bottom + pad
      ) {
        continue
      }
      const scriptId = row.getAttribute('data-testid')!.slice('script-'.length)
      const items = [...row.querySelectorAll<HTMLElement>('.bsx-block')]
      let slot = items.length
      let dropX = items.length
        ? items[items.length - 1].getBoundingClientRect().right - rowRect.left + 2
        : 0
      for (let i = 1; i < items.length; i += 1) {
        if (exclude && exclude.scriptId === scriptId && i === exclude.index) continue
        const itemRect = items[i].getBoundingClientRect()
        if (x < itemRect.left + itemRect.width / 2) {
          slot = i
          dropX = itemRect.left - rowRect.left - 2
          break
        }
      }
      return { scriptId, slot: Math.max(1, slot), dropX }
    }
    return null
  }

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

  const blockDragUpdate = (x: number, y: number) => {
    const drag = blockDrag.current
    if (!drag) return
    const onBin = overBin(x, y)
    setBinArmed(onBin)
    let targetScriptId: string | null = null
    let targetSlot: number | null = null
    let dropX: number | null = null
    if (!onBin && drag.index > 0) {
      const hit = scanRows(x, y, { scriptId: drag.scriptId, index: drag.index })
      if (hit) {
        targetScriptId = hit.scriptId
        targetSlot = hit.slot
        dropX = hit.dropX
      }
    }
    setDragBlk({
      scriptId: drag.scriptId,
      index: drag.index,
      cx: x,
      cy: y,
      onBin,
      targetScriptId,
      targetSlot,
      dropX,
    })
  }

  const onBlockDown = (
    event: ReactPointerEvent,
    scriptId: string,
    index: number,
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
      index,
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
    const finalHit =
      drag && !info?.onBin && drag.index > 0
        ? scanRows(drag.lastX, drag.lastY, {
            scriptId: drag.scriptId,
            index: drag.index,
          })
        : null
    const targetScriptId = finalHit?.scriptId ?? info?.targetScriptId ?? null
    const rawTargetSlot = finalHit?.slot ?? info?.targetSlot ?? null
    const targetSlot =
      drag &&
      targetScriptId === drag.scriptId &&
      rawTargetSlot !== null &&
      drag.index < rawTargetSlot
        ? rawTargetSlot - 1
        : rawTargetSlot
    blockDrag.current = null
    setDragBlk(null)
    setBinArmed(false)
    if (commit && blockDidDrag.current && info && drag) {
      if (info.onBin) {
        sfx.trash()
        useBlocksStore.getState().removeBlock(drag.scriptId, drag.index)
      } else if (
        targetScriptId &&
        (targetScriptId !== drag.scriptId || targetSlot !== drag.index)
      ) {
        sfx.snap()
        useBlocksStore
          .getState()
          .moveBlockAcross(
            drag.scriptId,
            drag.index,
            targetScriptId,
            targetSlot ?? 1,
          )
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
    const block = script?.blocks[dragBlk.index]
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
