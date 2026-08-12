import { describe, expect, it } from 'vitest'

import { PAGE_THREE_BUG, c6Project, runC6 } from './journeyWestC6Program'

describe('Journey West C6 three-page program', () => {
  it('runs all three pages in order to a stable End', async () => {
    const trace = await runC6(c6Project())
    expect(trace).toContain('page-1:goto:2')
    expect(trace).toContain('page-2:goto:3')
    expect(trace.at(-1)).toBe('page-3:end')
  })

  it('preserves the observable Again bug for P7', async () => {
    const trace = await runC6(c6Project(undefined, undefined, PAGE_THREE_BUG))
    expect(trace).toContain('page-3:stop')
    expect(trace).toContain('page-3:planned:forever')
    expect(trace.at(-1)).not.toBe('page-3:end')
  })
})
