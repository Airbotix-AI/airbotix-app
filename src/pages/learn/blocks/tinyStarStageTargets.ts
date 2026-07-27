import type { Character } from './blocksModel'

export const TINY_STAR_A2_RIGHT_BACKGROUND = 'tsv-cloud-road-right'
export const TINY_STAR_A2_LEFT_BACKGROUND = 'tsv-cloud-road-left-target'
export const TINY_STAR_A2_START_GX = 8

export function tinyStarA2TargetGx(
  background: string,
  lessonId?: string,
): number | undefined {
  if (background === TINY_STAR_A2_LEFT_BACKGROUND) return 6
  if (background !== TINY_STAR_A2_RIGHT_BACKGROUND) return undefined
  return lessonId === 'tsv-s1-a2-s' ? 10 : 11
}

export const TINY_STAR_DELIVERY_START_GX = 4
export const TINY_STAR_DELIVERY_GY = 10
export const TINY_STAR_DELIVERY_DISTANCES = [1, 2, 3] as const
export const TINY_STAR_BREAKFAST_CART_ID = 'breakfast-cart'
export const TINY_STAR_BREAKFAST_CART_ASSET =
  '/story-blocks/tiny-star-village/props/breakfast-cart-right-v01.png'
export const TINY_STAR_BREAKFAST_CART_LEGACY_ASSET =
  '/story-blocks/tiny-star-village/props/breakfast-cart.svg'

export function tinyStarBreakfastCartAssetIsKnown(asset: string | undefined): boolean {
  return asset === TINY_STAR_BREAKFAST_CART_ASSET || asset === TINY_STAR_BREAKFAST_CART_LEGACY_ASSET
}

export const TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE = {
  1: 'tsv-breakfast-stop-distance-1',
  2: 'tsv-breakfast-stop-distance-2',
  3: 'tsv-breakfast-stop-distance-3',
} as const

const TINY_STAR_DELIVERY_DISTANCE_BY_BACKGROUND = new Map<string, number>(
  Object.entries(TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE).map(([distance, background]) => [
    background,
    Number(distance),
  ]),
)

export const TINY_STAR_DELIVERY_PARCELS = [
  { id: 'apple', label: 'Apple', name: 'Apple Breakfast', emoji: '🍎' },
  { id: 'gift', label: 'Gift', name: 'Gift Breakfast', emoji: '🎁' },
  { id: 'star', label: 'Star', name: 'Star Breakfast', emoji: '⭐' },
] as const

export interface TinyStarDeliveryDesign {
  distance: number
  parcel: (typeof TINY_STAR_DELIVERY_PARCELS)[number]
}

export function tinyStarDeliveryDistance(background: string): number | undefined {
  return TINY_STAR_DELIVERY_DISTANCE_BY_BACKGROUND.get(background)
}

export function tinyStarDeliveryDesign(
  cart: Character | undefined,
  background: string,
): TinyStarDeliveryDesign | null {
  if (
    !cart ||
    cart.id !== TINY_STAR_BREAKFAST_CART_ID ||
    !tinyStarBreakfastCartAssetIsKnown(cart.asset) ||
    cart.start.gx !== TINY_STAR_DELIVERY_START_GX ||
    cart.start.gy !== TINY_STAR_DELIVERY_GY ||
    cart.start.size !== 1 ||
    cart.start.rot !== 0
  ) {
    return null
  }
  const distance = tinyStarDeliveryDistance(background)
  const parcel = TINY_STAR_DELIVERY_PARCELS.find(
    (candidate) => candidate.name === cart.name && candidate.emoji === cart.emoji,
  )
  return distance === undefined || !parcel ? null : { distance, parcel }
}
