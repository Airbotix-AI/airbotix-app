import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const PUBLIC_ROOT = resolve(process.cwd(), 'public/story-blocks/journey-to-the-west')

const REQUIRED_S1_ASSETS = [
  'backgrounds/s1/c4/before-v01.webp',
  'backgrounds/s1/c4/resolved-v01.webp',
  'backgrounds/s1/c5/before-v01.webp',
  'backgrounds/s1/c5/resolved-v01.webp',
  'backgrounds/s1/c6/page1-before-v01.webp',
  'backgrounds/s1/c6/page1-resolved-v01.webp',
  'backgrounds/s1/c6/page2-before-v01.webp',
  'backgrounds/s1/c6/page2-resolved-v01.webp',
  'backgrounds/s1/c6/page3-before-v01.webp',
  'backgrounds/s1/c6/page3-resolved-v01.webp',
  'characters/bodhi-master/neutral-v01.png',
  'characters/dragon-king/neutral-v01.png',
  'characters/heaven-duty-official/neutral-v01.png',
  'characters/wukong-traveller/hands-free-neutral-v01.png',
  'characters/wukong-traveller/neutral-v01.png',
  'props/name-token/blank-v01.png',
  'props/ruyi-staff/neutral-v01.png',
] as const

describe('Journey to the West Season 1 product assets', () => {
  it.each(REQUIRED_S1_ASSETS)('ships %s in the app public bundle', (relativePath) => {
    expect(existsSync(resolve(PUBLIC_ROOT, relativePath))).toBe(true)
  })
})
