import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import { MoreHorizontal, Redo2, Undo2, Volume2, VolumeX } from 'lucide-react'

import { RaiseHandButton } from '../liveClass/RaiseHandButton'
import { BlocksSharePanel } from './BlocksSharePanel'
import { READONLY_EDIT_DISABLED, type SaveStatus } from './blocksStudioChrome'
import type { BlocksProject } from './blocksModel'

interface BlocksStudioToolbarProps {
  readOnly: boolean
  embedded: boolean
  demoExitHref?: string
  homeHref: string
  canUndo: boolean
  canRedo: boolean
  undo: () => void
  redo: () => void
  project: BlocksProject
  currentPageIndex: number
  saveStatus: SaveStatus
  hasStoryMission: boolean
  openStoryMission: () => void
  muted: boolean
  toggleMute: () => void
  projectId?: string
  theme: 'light' | 'dark'
  prepMode: boolean
  moreBtnRef: Ref<HTMLButtonElement>
  moreMenuOpen: boolean
  toggleMoreMenu: () => void
  go: () => void
  running: boolean
}

export function BlocksStudioToolbar({
  readOnly,
  embedded,
  demoExitHref,
  homeHref,
  canUndo,
  canRedo,
  undo,
  redo,
  project,
  currentPageIndex,
  saveStatus,
  hasStoryMission,
  openStoryMission,
  muted,
  toggleMute,
  projectId,
  theme,
  prepMode,
  moreBtnRef,
  moreMenuOpen,
  toggleMoreMenu,
  go,
  running,
}: BlocksStudioToolbarProps) {
  return (
    <header className="bsx-card bsx-toolbar items-center gap-2 rounded-3xl px-3 py-2">
      {readOnly || embedded ? null : demoExitHref ? (
        <a
          href={demoExitHref}
          data-testid="demo-home"
          className="bsx-press bsx-toolbar-home grid h-11 w-11 place-items-center text-[20px]"
          title="Back to Try it"
        >
          🏠
        </a>
      ) : (
        <Link
          to={homeHref}
          className="bsx-press bsx-toolbar-home grid h-11 w-11 place-items-center text-[20px]"
          title="Save & back"
        >
          🏠
        </Link>
      )}
      <div className="bsx-toolbar-history flex items-center gap-2">
        <button
          type="button"
          data-testid="undo"
          className={`bsx-press grid h-11 w-11 place-items-center disabled:opacity-40${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
          onClick={undo}
          disabled={readOnly || !canUndo}
          aria-disabled={readOnly || undefined}
          title="Undo (⌘Z)"
        >
          <Undo2 size={20} />
        </button>
        <button
          type="button"
          data-testid="redo"
          className={`bsx-press grid h-11 w-11 place-items-center disabled:opacity-40${readOnly ? ` ${READONLY_EDIT_DISABLED}` : ''}`}
          onClick={redo}
          disabled={readOnly || !canRedo}
          aria-disabled={readOnly || undefined}
          title="Redo (⌘⇧Z)"
        >
          <Redo2 size={20} />
        </button>
      </div>
      <div className="bsx-toolbar-title min-w-0 px-1">
        <div className="truncate text-[15px] font-extrabold leading-tight">{project.name}</div>
        <div
          className="bsx-muted truncate text-[11px] font-semibold"
          data-testid="save-status"
          data-status={saveStatus}
        >
          Page {currentPageIndex + 1} of {project.pages.length} ·{' '}
          {saveStatus === 'saved'
            ? '✓ saved'
            : saveStatus === 'saving'
              ? 'saving…'
              : 'saved on this device'}
        </div>
      </div>
      <div className="bsx-toolbar-spacer flex-1" />
      <div className="bsx-toolbar-tools flex items-center gap-2">
        {hasStoryMission && (
          <button
            type="button"
            className="bsx-mission-launcher"
            data-testid="story-mission-launcher"
            onClick={openStoryMission}
            title="Open the story and mission"
          >
            📖 <span>Story mission</span>
          </button>
        )}
        <button
          type="button"
          className={`bsx-press grid h-11 w-11 place-items-center${muted ? ' bsx-muted-on' : ''}`}
          onClick={toggleMute}
          data-testid="mute-toggle"
          aria-pressed={muted}
          title={muted ? 'Sounds are OFF — tap to turn on' : 'Sounds are ON — tap to mute'}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
        {projectId && (
          <BlocksSharePanel
            projectId={projectId}
            theme={theme}
            readOnly={readOnly}
            prepMode={prepMode}
          />
        )}
        <RaiseHandButton readOnly={readOnly} />
        <button
          ref={moreBtnRef}
          type="button"
          className="bsx-press grid h-11 w-11 place-items-center"
          data-testid="more-menu-btn"
          aria-haspopup="menu"
          aria-expanded={moreMenuOpen}
          title="More"
          onClick={toggleMoreMenu}
        >
          <MoreHorizontal size={20} />
        </button>
      </div>
      <button
        type="button"
        data-testid="go-button"
        onClick={go}
        disabled={running}
        className="bsx-toolbar-go inline-flex h-11 items-center whitespace-nowrap rounded-full bg-brand-mint px-6 text-[16px] font-extrabold text-white shadow-brand-mint transition hover:-translate-y-0.5 disabled:opacity-60"
        title="Run every 🚩 start"
      >
        ▶ Go!
      </button>
    </header>
  )
}
