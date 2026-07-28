import { createPortal } from 'react-dom'
import { RotateCcw } from 'lucide-react'

import { sfx } from './sounds'

interface ResetStudioDialogProps {
  open: boolean
  theme: 'light' | 'dark'
  close: () => void
  reset: () => void
}

export function ResetStudioDialog({
  open,
  theme,
  close,
  reset,
}: ResetStudioDialogProps) {
  if (!open) return null

  return createPortal(
    <div
      className="bsx bsx-sheet-bg"
      data-theme={theme}
      onPointerDown={close}
    >
      <div
        className="bsx-confirm"
        data-testid="reset-confirm"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="bsx-confirm-icon">
          <RotateCcw size={34} />
        </div>
        <div className="bsx-confirm-title">Start over?</div>
        <div className="bsx-confirm-text">
          Everyone hops back to their start spots. Your blocks stay just the way you made
          them. ✨
        </div>
        <div className="bsx-confirm-btns">
          <button
            type="button"
            className="bsx-confirm-cancel"
            onClick={() => {
              sfx.tap()
              close()
            }}
          >
            Keep playing
          </button>
          <button
            type="button"
            className="bsx-confirm-ok"
            data-testid="reset-confirm-ok"
            onClick={() => {
              sfx.page()
              reset()
              close()
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
