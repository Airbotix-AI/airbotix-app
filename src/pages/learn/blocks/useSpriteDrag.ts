import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { GRID_H, GRID_W } from './blocksModel'
import { useBlocksStore } from './blocksStore'
import { sfx } from './sounds'
import { TINY_STAR_BELL_TOWER_ID, isTinyStarBellPageId } from './tinyStarBellTower'

interface UseSpriteDragOptions {
  running: boolean
  present: boolean
  readOnly: boolean
  pageId: string
  tapSprite: (id: string) => void
}

export function useSpriteDrag({
  running,
  present,
  readOnly,
  pageId,
  tapSprite,
}: UseSpriteDragOptions) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const dragMoved = useRef(false)

  const onSpriteDown = (event: ReactPointerEvent, id: string) => {
    if (running || present || readOnly) return
    if (id === TINY_STAR_BELL_TOWER_ID && isTinyStarBellPageId(pageId)) return
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
    setDragging(id)
    dragMoved.current = false
    useBlocksStore.getState().selectChar(id)
  }

  const onSpriteMove = (event: ReactPointerEvent, id: string) => {
    if (dragging !== id || !stageRef.current) return
    if (!dragMoved.current) sfx.pickup()
    dragMoved.current = true
    const rect = stageRef.current.getBoundingClientRect()
    const gx = ((event.clientX - rect.left) / rect.width) * GRID_W - 0.5
    const gy = ((event.clientY - rect.top) / rect.height) * GRID_H - 0.5
    useBlocksStore.getState().moveCharacter(id, gx, gy)
  }

  const onSpriteUp = (id: string) => {
    const wasDrag = dragMoved.current
    setDragging(null)
    useBlocksStore.getState().endCoalesce()
    if (!wasDrag) tapSprite(id)
  }

  return { stageRef, dragging, onSpriteDown, onSpriteMove, onSpriteUp }
}
