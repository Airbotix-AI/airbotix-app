import type { CSSProperties } from 'react'

const POPOVER_EDGE_GAP = 8
const POPOVER_MIN_VISIBLE_HEIGHT = 96
const POPOVER_WIDTH = 230

export function blockEditorViewportStyle(
  left: number,
  top: number,
  viewportWidth: number,
  viewportHeight: number,
): CSSProperties {
  const clampedLeft = Math.max(
    POPOVER_EDGE_GAP,
    Math.min(left, viewportWidth - POPOVER_WIDTH - POPOVER_EDGE_GAP),
  )
  const clampedTop = Math.max(
    POPOVER_EDGE_GAP,
    Math.min(top, viewportHeight - POPOVER_MIN_VISIBLE_HEIGHT - POPOVER_EDGE_GAP),
  )

  return {
    left: clampedLeft,
    top: clampedTop,
    width: POPOVER_WIDTH,
    maxHeight: Math.max(
      POPOVER_MIN_VISIBLE_HEIGHT,
      viewportHeight - clampedTop - POPOVER_EDGE_GAP,
    ),
    overflowY: 'auto',
  }
}
