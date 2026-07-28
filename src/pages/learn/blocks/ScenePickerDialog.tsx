import { createPortal } from 'react-dom'

import { SCENES, sceneId } from './library'
import { sfx } from './sounds'
import { useBlocksStore } from './blocksStore'

interface ScenePickerDialogProps {
  open: boolean
  theme: 'light' | 'dark'
  background: string
  close: () => void
}

export function ScenePickerDialog({
  open,
  theme,
  background,
  close,
}: ScenePickerDialogProps) {
  if (!open) return null

  return createPortal(
    <div
      className="bsx bsx-sheet-bg"
      data-theme={theme}
      onPointerDown={close}
    >
      <div
        data-testid="scene-picker"
        className="bsx-sheet"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="bsx-sheet-head">
          <span>Pick a scene 🏞</span>
          <button
            type="button"
            className="bsx-press bsx-sheet-x"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="bsx-scene-grid">
          {SCENES.map((sc) => (
            <button
              key={sc.id}
              type="button"
              data-testid={`scene-${sc.id}`}
              className={`bsx-scene-tile bsx-stage${sceneId(background) === sc.id ? ' sel' : ''}`}
              data-scene={sc.id}
              title={sc.label}
              onClick={() => {
                sfx.add()
                useBlocksStore.getState().setBackground(sc.id)
                close()
              }}
            >
              <span className="bsx-scene-name">
                {sc.emoji} {sc.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
