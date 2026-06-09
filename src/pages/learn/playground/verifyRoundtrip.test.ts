import { describe, expect, it } from 'vitest'

import type { ConsoleLine } from './buildGamePreview'
import { extractRuntimeErrors, hasRuntimeError } from './verifyRoundtrip'

const line = (level: ConsoleLine['level'], text: string, loc?: ConsoleLine['loc']): ConsoleLine => ({
  level,
  text,
  loc,
})

describe('extractRuntimeErrors (self-verify, MP3 / D-PAP-09,13,23)', () => {
  it('keeps only error-level lines and formats with the source location', () => {
    const errs = extractRuntimeErrors([
      line('log', 'starting up'),
      line('warn', 'Scene not found'),
      line('error', 'TypeError: this.physics is undefined', {
      file: 'src/scenes/Game.js',
      line: 12,
      col: 5,
    }),
    ])
    expect(errs).toEqual(['TypeError: this.physics is undefined (src/scenes/Game.js:12)'])
  })

  it('drops the shim "ready" handshake and blank lines', () => {
    expect(extractRuntimeErrors([line('error', 'ready'), line('error', '   ')])).toEqual([])
  })

  it('de-dupes identical errors and caps the count at 6', () => {
    const dup = Array.from({ length: 10 }, () => line('error', 'same boom'))
    expect(extractRuntimeErrors(dup)).toEqual(['same boom'])
    const many = Array.from({ length: 10 }, (_, i) => line('error', `boom ${i}`))
    expect(extractRuntimeErrors(many)).toHaveLength(6)
  })

  it('formats an error without a location as plain text', () => {
    expect(extractRuntimeErrors([line('error', 'Uncaught ReferenceError: x')])).toEqual([
      'Uncaught ReferenceError: x',
    ])
  })

  it('hasRuntimeError reflects whether there is any real error', () => {
    expect(hasRuntimeError([line('warn', 'just a warning'), line('error', 'ready')])).toBe(false)
    expect(hasRuntimeError([line('error', 'real boom')])).toBe(true)
  })
})
