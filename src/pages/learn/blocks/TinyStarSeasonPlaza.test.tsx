// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { TinyStarSeasonPlaza } from './TinyStarSeasonPlaza'
import { TINY_STAR_PLAZA_ASSETS } from './tinyStarAssets'

afterEach(cleanup)

describe('TinyStarSeasonPlaza', () => {
  it('uses the zero-star plaza and overlays one star for each finished chapter', () => {
    render(<TinyStarSeasonPlaza completedCount={12} sceneCount={24} seasonComplete={false} />)

    expect(screen.getByTestId('story-world-cast')).toHaveAttribute('data-progress-stars', '3')
    expect(screen.getByTestId('story-world-progress-stars').children).toHaveLength(3)
    expect(screen.getByTestId('story-world-cast').querySelector('.tsv-season-plaza-bg'))
      .toHaveAttribute('src', TINY_STAR_PLAZA_ASSETS.progress)
  })

  it('uses the finished plaza and joyful formal avatars after all scenes are complete', () => {
    render(<TinyStarSeasonPlaza completedCount={24} sceneCount={24} seasonComplete />)

    expect(screen.getByTestId('story-world-cast')).toHaveAttribute('data-progress-stars', '6')
    expect(screen.queryByTestId('story-world-progress-stars')).not.toBeInTheDocument()
    expect(screen.getByTestId('story-world-cast').querySelector('.tsv-season-plaza-bg'))
      .toHaveAttribute('src', TINY_STAR_PLAZA_ASSETS.complete)
    expect(screen.getByTestId('story-world-cast').querySelector('[data-avatar="Lumilo"]'))
      .toHaveAttribute('src', expect.stringContaining('success-joyful-v01.png'))
  })
})
