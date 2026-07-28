// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { router } from './router'

describe('public authentication routes', () => {
  it('mounts the parent-approved kid handoff outside the protected Learn tree', () => {
    const handoff = router.routes.find((route) => route.path === '/learn/handoff')
    const protectedLearn = router.routes.find((route) => route.path === '/learn')

    expect(handoff).toBeDefined()
    expect(protectedLearn?.children?.some((route) => route.path === 'handoff')).toBe(false)
  })
})
