import { describe, expect, it } from 'vitest'
import { CHARACTER_GROUPS, SCENES, sceneId } from './library'

describe('Tiny Star Village scene library', () => {
  it('keeps the formal Dot Dot rooftop background instead of falling back to meadow', () => {
    expect(SCENES).toContainEqual({
      id: 'tsv-rooftop',
      label: 'Dot Dot’s rooftop',
      emoji: '🌙',
    })
    expect(sceneId('tsv-rooftop')).toBe('tsv-rooftop')
    expect(sceneId('tsv-greeting-stage')).toBe('tsv-greeting-stage')
    expect(sceneId('tsv-clocktower-path')).toBe('tsv-clocktower-path')
  })

  it('offers the formal Tiny Star cast, props, and three workbench backgrounds', () => {
    const tinyStar = CHARACTER_GROUPS.find((group) => group.label === 'Tiny Star')

    expect(tinyStar?.items.map((item) => item.name)).toEqual([
      'Lumilo',
      'Tuan Tuan',
      'Dot Dot',
      'Breakfast Cart',
      'Morning Bell',
    ])
    expect(tinyStar?.items.every((item) => item.asset?.startsWith('/story-blocks/'))).toBe(true)
    expect(SCENES.filter((scene) => scene.id.startsWith('tsv-choice-workbench-'))).toHaveLength(3)
    expect(sceneId('tsv-choice-workbench-teal')).toBe('tsv-choice-workbench-teal')
  })
})
