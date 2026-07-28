import { createPortal } from 'react-dom'
import { Expand, Moon, RotateCcw, Sun } from 'lucide-react'

import { sfx } from './sounds'

interface StudioMoreMenuProps {
  anchor: { right: number; top: number } | null
  theme: 'light' | 'dark'
  toggleTheme: () => void
  close: () => void
  openReset: () => void
  present: boolean
  togglePresent: () => void
}

export function StudioMoreMenu({
  anchor,
  theme,
  toggleTheme,
  close,
  openReset,
  present,
  togglePresent,
}: StudioMoreMenuProps) {
  if (!anchor) return null

  return createPortal(
    <div
      className="bsx"
      data-theme={theme}
      data-testid="more-menu"
      style={{ position: 'fixed', right: anchor.right, top: anchor.top, zIndex: 80 }}
    >
      <div className="bsx-menu" role="menu">
        <button
          type="button"
          className="bsx-menu-row"
          data-testid="theme-toggle"
          onClick={() => {
            toggleTheme()
            close()
          }}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          <span>{theme === 'dark' ? 'Day mode' : 'Night mode'}</span>
        </button>
        <button
          type="button"
          className="bsx-menu-row"
          data-testid="reset-button"
          onClick={() => {
            sfx.tap()
            close()
            openReset()
          }}
        >
          <RotateCcw size={18} />
          <span>Reset</span>
        </button>
        <button
          type="button"
          className="bsx-menu-row"
          data-testid="present-toggle"
          onClick={() => {
            close()
            togglePresent()
          }}
        >
          <Expand size={18} />
          <span>{present ? 'Exit big screen' : 'Big screen'}</span>
        </button>
      </div>
    </div>,
    document.body,
  )
}
