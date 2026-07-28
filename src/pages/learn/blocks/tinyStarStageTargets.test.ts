import { describe, expect, it } from 'vitest'

import type { Character } from './blocksModel'
import {
  TINY_STAR_A2_LEFT_BACKGROUND,
  TINY_STAR_A2_RIGHT_BACKGROUND,
  TINY_STAR_BREAKFAST_CART_ASSET,
  TINY_STAR_BREAKFAST_CART_LEGACY_ASSET,
  TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE,
  tinyStarA2TargetGx,
  tinyStarBreakfastCartAssetIsKnown,
  tinyStarDeliveryDesign,
  tinyStarDeliveryDistance,
} from './tinyStarStageTargets'

function deliveryCart(name = 'Gift Breakfast', emoji = '🎁'): Character {
  return {
    id: 'breakfast-cart',
    name,
    emoji,
    asset: TINY_STAR_BREAKFAST_CART_ASSET,
    start: { gx: 4, gy: 10, size: 1, rot: 0 },
    scripts: [
      {
        id: 'breakfast-cart-ship',
        blocks: [{ op: 'when_flag' }, { op: 'move_right', n: 2 }, { op: 'end' }],
      },
    ],
  }
}

describe('Tiny Star locked stage targets', () => {
  it('maps A2 background selection to fixed left and right runner coordinates', () => {
    expect(tinyStarA2TargetGx(TINY_STAR_A2_LEFT_BACKGROUND)).toBe(6)
    expect(tinyStarA2TargetGx(TINY_STAR_A2_RIGHT_BACKGROUND, 'tsv-s1-a2-b')).toBe(11)
    expect(tinyStarA2TargetGx(TINY_STAR_A2_RIGHT_BACKGROUND, 'tsv-s1-a2-s')).toBe(10)
    expect(tinyStarA2TargetGx('meadow')).toBeUndefined()
  })

  it('maps each A4 background to its baked-in table distance', () => {
    expect(tinyStarDeliveryDistance(TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[1])).toBe(1)
    expect(tinyStarDeliveryDistance(TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[2])).toBe(2)
    expect(tinyStarDeliveryDistance(TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[3])).toBe(3)
    expect(tinyStarDeliveryDistance('meadow')).toBeUndefined()
  })

  it('reads parcel identity from the cart and distance from the locked background', () => {
    expect(
      tinyStarDeliveryDesign(deliveryCart(), TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[2]),
    ).toMatchObject({ distance: 2, parcel: { id: 'gift' } })
  })

  it('accepts only the canonical cart and the exact legacy SVG alias', () => {
    expect(tinyStarBreakfastCartAssetIsKnown(TINY_STAR_BREAKFAST_CART_ASSET)).toBe(true)
    expect(tinyStarBreakfastCartAssetIsKnown(TINY_STAR_BREAKFAST_CART_LEGACY_ASSET)).toBe(true)
    expect(
      tinyStarBreakfastCartAssetIsKnown(
        '/story-blocks/tiny-star-village/props/breakfast-cart-left-v01.png',
      ),
    ).toBe(false)

    const legacyCart = deliveryCart()
    legacyCart.asset = TINY_STAR_BREAKFAST_CART_LEGACY_ASSET
    expect(
      tinyStarDeliveryDesign(legacyCart, TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[2]),
    ).toMatchObject({ distance: 2, parcel: { id: 'gift' } })
  })

  it('rejects unapproved cart identity, geometry, assets and backgrounds', () => {
    expect(
      tinyStarDeliveryDesign(
        deliveryCart('Breakfast Cart', '🚙'),
        TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[2],
      ),
    ).toBeNull()

    const moved = deliveryCart()
    moved.start.gx = 5
    expect(
      tinyStarDeliveryDesign(moved, TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[2]),
    ).toBeNull()

    const wrongAsset = deliveryCart()
    wrongAsset.asset = '/story-blocks/unapproved.svg'
    expect(
      tinyStarDeliveryDesign(wrongAsset, TINY_STAR_DELIVERY_BACKGROUND_BY_DISTANCE[2]),
    ).toBeNull()

    expect(tinyStarDeliveryDesign(deliveryCart(), 'meadow')).toBeNull()
  })
})
