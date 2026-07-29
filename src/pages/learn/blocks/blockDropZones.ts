// Pure drop-target geometry for the block editor: where in a script's tree a
// dragged block would land. Kept out of the React hook so both the drag layer
// and the chain renderer can share it (and so it stays unit-testable without a
// DOM-less mock of the hook).

import {
  type BlockPath,
  pathFromKey,
  pathIsWithin,
  samePath,
} from './blocksModel'

/** Where a dragged block would land: the full insertion path in a track. */
export interface DropHit {
  scriptId: string
  path: number[]
}

export type ScanDropZones = (
  x: number,
  y: number,
  exclude?: { scriptId: string; path: BlockPath },
) => DropHit | null

/**
 * Dropping a block back where it already is — either onto its own slot, or just
 * after itself (the gap on its right edge is the same position once the block
 * is lifted out). Committing those would burn an undo step for nothing.
 */
export function isNoopDrop(from: BlockPath, to: BlockPath): boolean {
  if (from.length !== to.length) return false
  const depth = from.length - 1
  for (let i = 0; i < depth; i += 1) {
    if (from[i] !== to[i]) return false
  }
  return to[depth] === from[depth] || to[depth] === from[depth] + 1
}

/**
 * Scan every registered drop zone for the one under the pointer. Zones are
 * nested (a C-block body sits inside its track), so the DEEPEST containing zone
 * wins — that is what makes "drag a block into the If" land inside the If
 * instead of beside it.
 */
export const scanDropZones: ScanDropZones = (x, y, exclude) => {
  const zones = [...document.querySelectorAll<HTMLElement>('[data-drop-zone]')]
  let best: { hit: DropHit; depth: number; area: number } | null = null
  for (const zone of zones) {
    const scriptId = zone.getAttribute('data-drop-zone')
    if (!scriptId) continue
    const zonePath = pathFromKey(zone.getAttribute('data-zone-path') ?? '')
    // A C-block can never be dropped into its own body.
    if (exclude && exclude.scriptId === scriptId && pathIsWithin(exclude.path, zonePath)) {
      continue
    }
    const rect = zone.getBoundingClientRect()
    // Track rows get a generous catch margin; nested bodies stay tight so the
    // body only claims the pointer when it is genuinely over it.
    const pad = zonePath.length === 0 ? 18 : 6
    if (
      x < rect.left - pad ||
      x > rect.right + pad ||
      y < rect.top - pad ||
      y > rect.bottom + pad
    ) {
      continue
    }
    // Direct children only — a nested body's blocks belong to ITS zone, not
    // this one. (Read off `children` rather than a `:scope >` selector, which
    // jsdom resolves as a descendant match.)
    const items = [...zone.children].filter((el): el is HTMLElement =>
      el instanceof HTMLElement && el.hasAttribute('data-block-path'),
    )
    const minSlot = zonePath.length === 0 ? 1 : 0 // the trigger holds slot 0
    let slot = items.length
    for (let i = minSlot; i < items.length; i += 1) {
      if (exclude && exclude.scriptId === scriptId && samePath(exclude.path, [...zonePath, i])) {
        continue
      }
      const itemRect = items[i].getBoundingClientRect()
      if (x < itemRect.left + itemRect.width / 2) {
        slot = i
        break
      }
    }
    const depth = zonePath.length
    const area = rect.width * rect.height
    if (!best || depth > best.depth || (depth === best.depth && area < best.area)) {
      best = {
        hit: { scriptId, path: [...zonePath, Math.max(minSlot, slot)] },
        depth,
        area,
      }
    }
  }
  return best?.hit ?? null
}


/**
 * The slot index the drop indicator belongs at inside THIS zone, or null when
 * the current drop target is somewhere else in the program.
 */
export function dropSlotInZone(
  target: DropHit | null,
  scriptId: string,
  zonePath: BlockPath,
): number | null {
  if (!target || target.scriptId !== scriptId) return null
  if (target.path.length !== zonePath.length + 1) return null
  return zonePath.every((value, i) => value === target.path[i])
    ? target.path[zonePath.length]
    : null
}

/** True when the drop target is anywhere inside this zone (incl. deeper). */
export function zoneHoldsDrop(
  target: DropHit | null,
  scriptId: string,
  zonePath: BlockPath,
): boolean {
  if (!target || target.scriptId !== scriptId) return false
  if (target.path.length <= zonePath.length) return false
  return zonePath.every((value, i) => value === target.path[i])
}
