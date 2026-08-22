import { describe, expect, it } from 'vitest'

import { blockEditorViewportStyle } from './blockEditorViewport'

describe('blockEditorViewportStyle', () => {
  it('keeps a long story dialogue picker inside a 1366 by 768 child viewport', () => {
    expect(blockEditorViewportStyle(1180, 460, 1366, 768)).toEqual({
      left: 1128,
      top: 460,
      width: 230,
      maxHeight: 300,
      overflowY: 'auto',
    })
  })

  it('keeps the editor reachable when a block sits beyond the viewport edges', () => {
    expect(blockEditorViewportStyle(-20, 900, 1024, 640)).toEqual({
      left: 8,
      top: 536,
      width: 230,
      maxHeight: 96,
      overflowY: 'auto',
    })
  })
})
