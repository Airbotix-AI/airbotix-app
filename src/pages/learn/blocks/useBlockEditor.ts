import {
  useEffect,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from 'react'

import {
  MAX_COLOR,
  MAX_PARAM,
  MAX_SPEED,
  blockAtPath,
  blockDef,
  type BlockOp,
  type Character,
} from './blocksModel'
import { useBlocksStore } from './blocksStore'
import type { StoryCoachCue, StoryMission } from './curriculumGuides'
import { sfx } from './sounds'
import { JTW_S2_C2_P6_LESSON_ID } from './jtwS2Builds'

export function canRepairEventTrigger(
  lessonId: string | undefined,
  wrongRunObserved: boolean,
  tapObserved: boolean,
): boolean {
  return lessonId === 'jtw-s1-c4-p6' || lessonId === JTW_S2_C2_P6_LESSON_ID
    ? wrongRunObserved
    : tapObserved
}

interface UseBlockEditorOptions {
  readOnly: boolean
  blockDidDrag: RefObject<boolean>
  selectedChar: Character
  pageCount: number
  storyMission?: StoryMission
  isA2PersonalShip: boolean
  isA2DirectionDebug: boolean
  isA3EventDebug: boolean
  isA4ParameterBuild: boolean
  isA4ParameterDebug: boolean
  isA5RelayDebug: boolean
  isA6OrderDebug: boolean
  missionWrongRunObserved: boolean
  missionTapObserved: boolean
  setStoryCoachCue: (cue: StoryCoachCue) => void
  openMission: () => void
}

export function useBlockEditor({
  readOnly,
  blockDidDrag,
  selectedChar,
  pageCount,
  storyMission,
  isA2PersonalShip,
  isA2DirectionDebug,
  isA3EventDebug,
  isA4ParameterBuild,
  isA4ParameterDebug,
  isA5RelayDebug,
  isA6OrderDebug,
  missionWrongRunObserved,
  missionTapObserved,
  setStoryCoachCue,
  openMission,
}: UseBlockEditorOptions) {
  const [editBlock, setEditBlock] = useState<{
    scriptId: string
    path: number[]
    left: number
    top: number
  } | null>(null)

  const openEditor = (
    event: ReactMouseEvent,
    scriptId: string,
    path: number[],
  ) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const width = 230
    const left = Math.min(
      Math.max(8, rect.left + rect.width / 2 - width / 2),
      window.innerWidth - width - 8,
    )
    setEditBlock({
      scriptId,
      path,
      left,
      top: Math.max(70, rect.top - 132),
    })
  }

  const onBlockTap = (
    event: ReactMouseEvent,
    scriptId: string,
    path: number[],
    op: string,
  ) => {
    if (readOnly) return
    if (blockDidDrag.current) return
    if ((isA4ParameterBuild || isA4ParameterDebug) && op !== 'move_right') return
    if (isA5RelayDebug && op !== 'wait') return
    if ((isA4ParameterDebug || isA5RelayDebug) && !missionWrongRunObserved) {
      setStoryCoachCue('retry')
      openMission()
      return
    }
    if (isA6OrderDebug) {
      if (!missionWrongRunObserved) {
        setStoryCoachCue('retry')
        openMission()
      }
      return
    }
    if (
      (storyMission?.lessonId === 'tsv-s1-a2-b' || isA2PersonalShip) &&
      (op === 'move_left' || op === 'move_right')
    ) {
      return
    }
    if (isA2DirectionDebug && (op === 'move_left' || op === 'move_right')) {
      if (!missionWrongRunObserved) {
        setStoryCoachCue('retry')
        openMission()
        return
      }
      sfx.tap()
      openEditor(event, scriptId, path)
      return
    }
    if (isA3EventDebug && (op === 'when_flag' || op === 'when_tap')) {
      if (!canRepairEventTrigger(storyMission?.lessonId, missionWrongRunObserved, missionTapObserved)) {
        setStoryCoachCue('retry')
        openMission()
        return
      }
      sfx.tap()
      openEditor(event, scriptId, path)
      return
    }
    if (isA2DirectionDebug || isA3EventDebug) return
    const definition = blockDef(op as BlockOp)
    if (definition.param === 'speed') {
      sfx.numUp()
      useBlocksStore.getState().cycleParamAtPath(scriptId, path, MAX_SPEED)
      return
    }
    if (definition.param === 'color') {
      sfx.tap()
      useBlocksStore.getState().cycleParamAtPath(scriptId, path, MAX_COLOR)
      return
    }
    if (
      !definition.hasN &&
      definition.param !== 'note' &&
      definition.param !== 'sound' &&
      op !== 'say' &&
      op !== 'if_touching'
    ) {
      return
    }
    sfx.tap()
    openEditor(event, scriptId, path)
  }

  useEffect(() => {
    if (!editBlock) return
    const onDown = (event: PointerEvent) => {
      if (!(event.target as HTMLElement).closest('[data-testid="block-editor"]')) {
        setEditBlock(null)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setEditBlock(null)
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
      useBlocksStore.getState().endCoalesce()
    }
  }, [editBlock])

  const editing = (() => {
    if (!editBlock) return null
    const script = selectedChar.scripts.find((item) => item.id === editBlock.scriptId)
    const block = script ? blockAtPath(script.blocks, editBlock.path) : undefined
    return block ? { ...editBlock, block } : null
  })()
  const editMax = editing?.block.op === 'goto_page' ? pageCount : MAX_PARAM

  return {
    editing,
    editMax,
    onBlockTap,
    closeBlockEditor: () => setEditBlock(null),
  }
}
