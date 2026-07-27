import { describe, expect, it } from 'vitest'
import { SCENES, sceneId } from './library'

describe('Tiny Star Village scene library', () => {
  it('keeps the formal Dot Dot rooftop background instead of falling back to meadow', () => {
    expect(SCENES).toContainEqual({
      id: 'tsv-rooftop',
      label: 'Dot Dot’s rooftop',
      emoji: '🌙',
    })
    expect(sceneId('tsv-rooftop')).toBe('tsv-rooftop')
  })
})
