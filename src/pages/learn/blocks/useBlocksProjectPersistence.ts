import { useEffect, useRef, useState, type MutableRefObject } from 'react'

import {
  loadBlocksProject,
  saveBlocksProject,
  type BlocksStoryProgress,
} from './blocksApi'
import { useBlocksStore } from './blocksStore'
import { SAVE_DEBOUNCE_MS, type SaveStatus } from './blocksStudioChrome'
import type { StoryCoachCue, StoryMission } from './curriculumGuides'
import { storyMissionFor } from './curriculumGuides'
import { storyMissionProgramMatches } from './storyMissionProgress'
import { captureBlocksThumbnail } from './thumbnail'
import { saveThumbnail } from '../playground/projectPersistence'

type StudioPhase = 'loading' | 'ready' | 'error'

interface UseBlocksProjectPersistenceOptions {
  projectId?: string
  readOnly: boolean
  dirty: number
  storyMission?: StoryMission
  setMissionHasRun: (value: boolean) => void
  setMissionCorrectRunFinished: (value: boolean) => void
  setMissionFixPersisted: (value: boolean) => void
  setMissionCompleted: (value: boolean) => void
  setStoryCoachCue: (cue: StoryCoachCue) => void
  setMissionOpen: (value: boolean) => void
}

export interface BlocksPersistenceRefs {
  versionRef: MutableRefObject<number>
  otherFilesRef: MutableRefObject<Awaited<ReturnType<typeof loadBlocksProject>>['otherFiles']>
  storyProgressRef: MutableRefObject<BlocksStoryProgress>
  completionSaveInFlightRef: MutableRefObject<boolean>
  savingRef: MutableRefObject<boolean>
  pendingRef: MutableRefObject<boolean>
  introducedMissionRef: MutableRefObject<string | null>
}

export function useBlocksProjectPersistence(
  options: UseBlocksProjectPersistenceOptions,
) {
  const {
    projectId,
    readOnly,
    dirty,
    storyMission,
  } = options
  const latestOptionsRef = useRef(options)
  latestOptionsRef.current = options

  const [phase, setPhase] = useState<StudioPhase>('loading')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const versionRef = useRef(0)
  const otherFilesRef = useRef<
    Awaited<ReturnType<typeof loadBlocksProject>>['otherFiles']
  >([])
  const storyProgressRef = useRef<BlocksStoryProgress>({
    schemaVersion: 1,
    completed: {},
  })
  const completionSaveInFlightRef = useRef(false)
  const savingRef = useRef(false)
  const pendingRef = useRef(false)
  const introducedMissionRef = useRef<string | null>(null)

  if (useBlocksStore.getState().readOnly !== readOnly) {
    useBlocksStore.getState().setReadOnly(readOnly)
  }

  useEffect(() => {
    useBlocksStore.getState().setReadOnly(readOnly)
    return () => {
      if (readOnly) useBlocksStore.getState().setReadOnly(false)
    }
  }, [readOnly])

  useEffect(() => {
    if (!projectId) return
    let alive = true
    loadBlocksProject(projectId)
      .then((loaded) => {
        if (!alive) return
        versionRef.current = loaded.version
        otherFilesRef.current = loaded.otherFiles
        storyProgressRef.current = loaded.storyProgress ?? {
          schemaVersion: 1,
          completed: {},
        }
        const loadedMission = storyMissionFor(loaded.project.lessonId)
        const loadedMissionCompleted = Boolean(
          loadedMission &&
          storyProgressRef.current.completed[loadedMission.lessonId] &&
          storyMissionProgramMatches(
            loaded.project,
            loadedMission.lessonId,
          ),
        )
        useBlocksStore.getState().load(loaded.project)
        useBlocksStore
          .getState()
          .setHistory(loaded.history.past, loaded.history.future)
        if (loadedMissionCompleted && loadedMission) {
          const latest = latestOptionsRef.current
          introducedMissionRef.current = projectId
          latest.setMissionHasRun(true)
          latest.setMissionCorrectRunFinished(true)
          latest.setMissionFixPersisted(true)
          latest.setMissionCompleted(true)
          latest.setStoryCoachCue('complete')
          latest.setMissionOpen(true)
        }
        setPhase('ready')
        if (!readOnly) {
          try {
            const cover = loaded.project.pages[0]
            if (cover) {
              void saveThumbnail(projectId, captureBlocksThumbnail(cover))
            }
          } catch {
            // Thumbnail refresh is best-effort.
          }
        }
      })
      .catch(() => {
        if (alive) setPhase('error')
      })
    return () => {
      alive = false
    }
  }, [projectId, readOnly])

  useEffect(() => {
    if (readOnly || phase !== 'ready' || dirty === 0 || !projectId) return
    setSaveStatus('saving')
    const timer = window.setTimeout(() => {
      if (savingRef.current) {
        pendingRef.current = true
        return
      }
      void (async () => {
        savingRef.current = true
        try {
          do {
            pendingRef.current = false
            const store = useBlocksStore.getState()
            const result = await saveBlocksProject({
              projectId,
              project: store.project,
              version: versionRef.current,
              otherFiles: otherFilesRef.current,
              history: { past: store.past, future: store.future },
              storyProgress: storyProgressRef.current,
            })
            versionRef.current = result.version
            if (result.status === 'kept-newest') {
              useBlocksStore.getState().load(result.project)
              storyProgressRef.current = result.storyProgress
            }
          } while (pendingRef.current)
          if (storyMission) {
            latestOptionsRef.current.setMissionFixPersisted(
              storyMissionProgramMatches(
                useBlocksStore.getState().project,
                storyMission.lessonId,
              ),
            )
          }
          savingRef.current = false
          setSaveStatus('saved')
          try {
            const cover = useBlocksStore.getState().project.pages[0]
            if (cover) {
              void saveThumbnail(projectId, captureBlocksThumbnail(cover))
            }
          } catch {
            // Thumbnail refresh is best-effort.
          }
        } catch {
          savingRef.current = false
          setSaveStatus('offline')
        }
      })()
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [dirty, phase, projectId, readOnly, storyMission])

  const refs: BlocksPersistenceRefs = {
    versionRef,
    otherFilesRef,
    storyProgressRef,
    completionSaveInFlightRef,
    savingRef,
    pendingRef,
    introducedMissionRef,
  }

  return { phase, saveStatus, setSaveStatus, ...refs }
}
