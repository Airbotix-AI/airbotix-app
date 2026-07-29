import { createPortal } from 'react-dom'

import {
  BUILT_IN_NOTES,
  BUILT_IN_SOUNDS,
  MAX_NOTE,
  MAX_SOUND,
  blockDef,
  type Block,
  type Character,
} from './blocksModel'
import { sfx } from './sounds'
import type { StoryCoachCue } from './curriculumGuides'
import type { BlocksTheme } from './blocksTheme'
import { useBlocksStore } from './blocksStore'

export interface EditingBlock {
  scriptId: string
  path: number[]
  left: number
  top: number
  block: Block
}

interface BlockEditorPopoverProps {
  editing: EditingBlock | null
  theme: BlocksTheme
  isA3EventDebug: boolean
  isA2DirectionDebug: boolean
  characters: Character[]
  selectedChar: Character
  missionSayChoices: readonly string[] | null
  pageCount: number
  editMax: number
  close: () => void
  setStoryCoachCue: (cue: StoryCoachCue) => void
}

export function BlockEditorPopover({
  editing,
  theme,
  isA3EventDebug,
  isA2DirectionDebug,
  characters,
  selectedChar,
  missionSayChoices,
  pageCount,
  editMax,
  close,
  setStoryCoachCue,
}: BlockEditorPopoverProps) {
  if (!editing) return null

  return createPortal(
    <div
      data-testid="block-editor"
      className="bsx bsx-card fixed z-[70] rounded-2xl p-3 shadow-card-soft"
      data-theme={theme}
      style={{ left: editing.left, top: editing.top, width: 230 }}
    >
      <div className="mb-2 flex items-center gap-2 text-[13px] font-extrabold">
        <span className="text-[20px]">{blockDef(editing.block.op).icon}</span>
        {isA3EventDebug &&
        (editing.block.op === 'when_flag' || editing.block.op === 'when_tap')
          ? 'Which start listens for a tap?'
          : isA2DirectionDebug &&
        (editing.block.op === 'move_left' || editing.block.op === 'move_right')
          ? 'Which way should Tuan Tuan go?'
          : editing.block.op === 'say'
            ? 'What should they say?'
            : editing.block.op === 'if_touching'
              ? 'Touching which friend?'
              : blockDef(editing.block.op).param === 'note'
                ? 'Which note? Tap to hear it!'
                : blockDef(editing.block.op).param === 'sound'
                  ? 'Which sound? Tap to hear it!'
                  : editing.block.op === 'goto_page'
                    ? `Which page? (1–${pageCount})`
                    : `How many? (${blockDef(editing.block.op).label})`}
      </div>
      {isA3EventDebug &&
      (editing.block.op === 'when_flag' || editing.block.op === 'when_tap') ? (
        <div className="grid grid-cols-2 gap-2" data-testid="event-repair-picker">
          {(['when_flag', 'when_tap'] as const).map((event) => (
            <button
              key={event}
              type="button"
              data-testid={`event-repair-${event}`}
              aria-pressed={editing.block.op === event}
              className="bsx-press rounded-xl border border-current/15 px-2 py-3 text-[13px] font-extrabold aria-pressed:bg-emerald-100"
              onClick={() => {
                if (editing.block.op === event) return
                sfx.tap()
                useBlocksStore.getState().replaceBlockOpAtPath(editing.scriptId, editing.path, event)
                close()
                setStoryCoachCue('test')
              }}
            >
              {event === 'when_flag' ? '🚩 Start' : '👆 On Tap'}
            </button>
          ))}
        </div>
      ) : isA2DirectionDebug &&
      (editing.block.op === 'move_left' || editing.block.op === 'move_right') ? (
        <div className="grid grid-cols-2 gap-2" data-testid="direction-repair-picker">
          {(['move_left', 'move_right'] as const).map((direction) => (
            <button
              key={direction}
              type="button"
              data-testid={`direction-repair-${direction}`}
              aria-pressed={editing.block.op === direction}
              className="bsx-press rounded-xl border border-current/15 px-2 py-3 text-[13px] font-extrabold aria-pressed:bg-emerald-100"
              onClick={() => {
                if (editing.block.op === direction) return
                sfx.tap()
                useBlocksStore
                  .getState()
                  .replaceBlockOpAtPath(editing.scriptId, editing.path, direction)
                close()
              }}
            >
              {direction === 'move_left' ? '⬅️ Left' : '➡️ Right'}
            </button>
          ))}
        </div>
      ) : editing.block.op === 'if_touching' ? (
        <div className="grid gap-2" data-testid="if-touching-picker">
          {characters
            .filter((character) => character.id !== selectedChar.id)
            .map((character) => (
              <button
                key={character.id}
                type="button"
                data-testid={`if-touching-choice-${character.id}`}
                aria-pressed={editing.block.text === character.id}
                className="bsx-press rounded-xl border border-current/15 px-3 py-2 text-left text-[13px] font-extrabold aria-pressed:bg-emerald-100"
                onClick={() => {
                  sfx.tap()
                  useBlocksStore
                    .getState()
                    .setSayTextAtPath(editing.scriptId, editing.path, character.id)
                  close()
                }}
              >
                {character.emoji} {character.name}
              </button>
            ))}
          {characters.length < 2 && (
            <p className="text-[12px] font-bold bsx-muted">
              Add another character first.
            </p>
          )}
        </div>
      ) : editing.block.op === 'say' ? (
        <div>
          <input
            data-testid="say-input"
            autoFocus
            maxLength={60}
            value={editing.block.text ?? 'Hi!'}
            onChange={(e) =>
              useBlocksStore
                .getState()
                .setSayTextAtPath(editing.scriptId, editing.path, e.target.value)
            }
            onKeyDown={(e) => e.key === 'Enter' && close()}
            className="bsx-card w-full rounded-xl px-3 py-2 text-[15px] font-bold outline-none"
          />
          {missionSayChoices && (
            <div className="mt-2 grid gap-1.5" data-testid="story-greeting-picker">
              {missionSayChoices.map((greeting) => (
                <button
                  key={greeting}
                  type="button"
                  className="bsx-press rounded-xl border border-current/15 px-2 py-2 text-left text-[12px] font-extrabold"
                  aria-pressed={editing.block.text === greeting}
                  onClick={() => {
                    sfx.tap()
                    useBlocksStore
                      .getState()
                      .setSayTextAtPath(editing.scriptId, editing.path, greeting)
                  }}
                >
                  💬 {greeting}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : blockDef(editing.block.op).param === 'note' ? (
        <div className="grid grid-cols-4 gap-2" data-testid="note-picker">
          {BUILT_IN_NOTES.map((note) => (
            <button
              key={note.id}
              type="button"
              data-testid={`note-choice-${note.id}`}
              aria-pressed={(editing.block.n ?? 1) === note.id}
              className="bsx-press rounded-xl border border-current/15 px-2 py-2 text-[12px] font-extrabold aria-pressed:bg-emerald-100"
              onClick={() => {
                sfx.playNote(note.id)
                useBlocksStore
                  .getState()
                  .setParamAtPath(editing.scriptId, editing.path, note.id, MAX_NOTE)
              }}
            >
              <span className="block text-[24px]" aria-hidden>
                {note.icon}
              </span>
              {note.label}
            </button>
          ))}
        </div>
      ) : blockDef(editing.block.op).param === 'sound' ? (
        <div className="grid grid-cols-3 gap-2" data-testid="sound-picker">
          {BUILT_IN_SOUNDS.map((sound) => (
            <button
              key={sound.id}
              type="button"
              data-testid={`sound-choice-${sound.id}`}
              aria-pressed={(editing.block.n ?? 1) === sound.id}
              className="bsx-press rounded-xl border border-current/15 px-2 py-2 text-[12px] font-extrabold aria-pressed:bg-emerald-100"
              onClick={() => {
                sfx.playSound(sound.id)
                useBlocksStore
                  .getState()
                  .setParamAtPath(editing.scriptId, editing.path, sound.id, MAX_SOUND)
              }}
            >
              <span className="block text-[24px]" aria-hidden>
                {sound.icon}
              </span>
              {sound.label}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            data-testid="num-minus"
            className="bsx-step"
            disabled={(editing.block.n ?? 1) <= 1}
            onClick={() => {
              sfx.numDown()
              useBlocksStore
                .getState()
                .setParamAtPath(
                  editing.scriptId,
                  editing.path,
                  (editing.block.n ?? 1) - 1,
                  editMax,
                )
            }}
          >
            −
          </button>
          <span data-testid="num-value" className="text-[30px] font-extrabold tabular-nums">
            {editing.block.n ?? 1}
          </span>
          <button
            type="button"
            data-testid="num-plus"
            className="bsx-step"
            onClick={() => {
              sfx.numUp()
              useBlocksStore
                .getState()
                .setParamAtPath(
                  editing.scriptId,
                  editing.path,
                  (editing.block.n ?? 1) + 1,
                  editMax,
                )
            }}
            disabled={(editing.block.n ?? 1) >= editMax}
          >
            +
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}
