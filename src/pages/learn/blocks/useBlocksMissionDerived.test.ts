import { describe, expect, it } from 'vitest'

import { eventTriggerWrongRunObserved, isEventTriggerDebugLesson } from './useBlocksMissionDerived'

describe('isEventTriggerDebugLesson', () => {
  it('enables the trigger repair picker for Tiny Star and Journey West debug lessons', () => {
    expect(isEventTriggerDebugLesson('tsv-s1-a3-d')).toBe(true)
    expect(isEventTriggerDebugLesson('jtw-s1-c4-p6')).toBe(true)
    expect(isEventTriggerDebugLesson('jtw-s1-c4-p5')).toBe(false)
  })
})

describe('eventTriggerWrongRunObserved', () => {
  it('recognises the Journey West C4-P6 Start trigger bug only after it is run', () => {
    expect(eventTriggerWrongRunObserved('jtw-s1-c4-p6', [{ op: 'when_flag' }])).toBe(true)
    expect(eventTriggerWrongRunObserved('jtw-s1-c4-p6', [{ op: 'when_tap' }])).toBe(false)
    expect(eventTriggerWrongRunObserved('jtw-s1-c4-p5', [{ op: 'when_flag' }])).toBe(false)
  })
})
