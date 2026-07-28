import { createPortal } from 'react-dom'

import { CHARACTER_GROUPS } from './library'
import { sfx } from './sounds'
import { useBlocksStore } from './blocksStore'

interface CharacterPickerDialogProps {
  open: boolean
  theme: 'light' | 'dark'
  charTab: number
  setCharTab: (tab: number) => void
  close: () => void
}

export function CharacterPickerDialog({
  open,
  theme,
  charTab,
  setCharTab,
  close,
}: CharacterPickerDialogProps) {
  if (!open) return null

  return createPortal(
    <div
      className="bsx bsx-sheet-bg"
      data-theme={theme}
      onPointerDown={close}
    >
      <div
        data-testid="friend-picker"
        className="bsx-sheet"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="bsx-sheet-head">
          <span>Pick a friend ✨</span>
          <button
            type="button"
            className="bsx-press bsx-sheet-x"
            onClick={close}
          >
            ✕
          </button>
        </div>
        <div className="bsx-sheet-tabs">
          {CHARACTER_GROUPS.map((g, i) => (
            <button
              key={g.label}
              type="button"
              className="bsx-tab"
              aria-pressed={charTab === i}
              onClick={() => {
                sfx.tap()
                setCharTab(i)
              }}
            >
              <span>{g.emoji}</span>
              <span>{g.label}</span>
            </button>
          ))}
        </div>
        <div className="bsx-sheet-grid">
          {CHARACTER_GROUPS[charTab].items.map((f) => (
            <button
              key={f.emoji}
              type="button"
              className="bsx-pick"
              title={f.name}
              onClick={() => {
                sfx.add()
                useBlocksStore.getState().addCharacter(f.emoji, f.name)
                close()
              }}
            >
              {f.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
