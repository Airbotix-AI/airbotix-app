import { useState, type KeyboardEvent } from 'react'
import './playground.css'

/** Near-black page background from the mockup's vignette (not bg-ink, which is lighter). */
const PAGE_BG = '#0F0B18'

interface StarterChip {
  label: string
  emoji: string
  /** Prompt prefilled into the textarea when the chip is tapped. */
  prompt: string
}

const STARTER_CHIPS: readonly StarterChip[] = [
  { emoji: '🏓', label: 'Pong', prompt: 'a pong game' },
  { emoji: '🟩', label: 'Platformer', prompt: 'a platformer where you jump across platforms' },
  { emoji: '🐦', label: 'Flappy', prompt: 'a flappy bird game' },
  { emoji: '🐍', label: 'Snake', prompt: 'a snake game' },
  { emoji: '🌀', label: 'Maze', prompt: 'a maze game where you find the exit' },
]

/**
 * Gemini-style landing entry for the kids' game Playground. Dark theme, a single
 * glowing prompt box (`.pg-glow` rotating brand-gradient halo) plus starter chips.
 * Submits the trimmed prompt via Enter (no Shift) or the send button.
 */
export function LandingScreen({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  const [prompt, setPrompt] = useState('')

  const submit = () => {
    const trimmed = prompt.trim()
    if (trimmed) onSubmit(trimmed)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{ backgroundColor: PAGE_BG }}
    >
      {/* Wordmark */}
      <p className="mb-10 text-xl font-extrabold text-stone2">
        <span className="text-brand-sky">✦</span> Airbotix Playground
      </p>

      {/* Prompt box with animated glow halo */}
      <div className="pg-glow w-full max-w-3xl rounded-2xl">
        <div className="relative rounded-2xl bg-[#221E30] p-5">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Describe a game and we'll build it…"
            aria-label="Describe a game"
            className="w-full resize-none bg-transparent text-lg text-canvas-pure placeholder:text-steel focus:outline-none"
          />

          {/* Send button */}
          <button
            type="button"
            onClick={submit}
            disabled={!prompt.trim()}
            aria-label="Build game"
            className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-brand-sky text-xl text-canvas-pure transition-opacity disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>

      {/* Starter chips */}
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {STARTER_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={() => setPrompt(chip.prompt)}
            className="rounded-full border border-[#3A3548] bg-[#221E30] px-4 py-2 text-sm font-bold text-canvas-pure transition-colors hover:border-brand-sky"
          >
            {chip.emoji} {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}
