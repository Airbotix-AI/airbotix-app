import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { TINY_STAR_SHARED_ASSET_PATHS } from './tinyStarAssets'

describe('Tiny Star shared asset catalog', () => {
  it('only references bundled public files and contains no duplicate paths', () => {
    expect(new Set(TINY_STAR_SHARED_ASSET_PATHS).size).toBe(TINY_STAR_SHARED_ASSET_PATHS.length)

    for (const asset of TINY_STAR_SHARED_ASSET_PATHS) {
      expect(asset.startsWith('/story-blocks/tiny-star-village/')).toBe(true)
      expect(existsSync(resolve(process.cwd(), 'public', asset.slice(1))), asset).toBe(true)
    }
  })
})
