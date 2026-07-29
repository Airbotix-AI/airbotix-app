// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { blankProject } from './blocksModel'
import { useBlocksStore } from './blocksStore'
import { CharacterPickerDialog } from './CharacterPickerDialog'

afterEach(cleanup)

describe('CharacterPickerDialog Tiny Star assets', () => {
  beforeEach(() => {
    useBlocksStore.getState().load(blankProject('Asset picker test'))
  })

  it('shows formal pose previews and saves the selected avatar asset', () => {
    const close = vi.fn()
    render(
      <CharacterPickerDialog
        open
        theme="light"
        charTab={0}
        setCharTab={vi.fn()}
        close={close}
      />,
    )

    const lumilo = screen.getByTitle('Lumilo')
    expect(lumilo.querySelectorAll('img')).toHaveLength(4)

    fireEvent.click(lumilo)

    const state = useBlocksStore.getState()
    const page = state.project.pages.find((item) => item.id === state.pageId)
    const selected = page?.characters.find((character) => character.id === state.charId)
    expect(selected).toMatchObject({
      name: 'Lumilo',
      emoji: '⭐',
      asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
    })
    expect(close).toHaveBeenCalledTimes(1)
  })
})
