import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Mic, Volume2 } from 'lucide-react'
import './playground.css'
import { useDemoMode } from '@/pages/try/demoMode'
import { ThemeToggle } from './ThemeToggle'
import { transcribeVoice } from './panes/playgroundApi'

interface StarterChip {
  label: string
  emoji: string
  /** Prompt prefilled into the textarea when the chip is tapped. */
  prompt: string
}

// Picture/icon themed starter chips (UDL / OD-6): a big emoji icon makes each
// idea readable to a non-reader, so a kid who can't read the label can still
// pick a starting point by its picture.
const STARTER_CHIPS: readonly StarterChip[] = [
  { emoji: '🏓', label: 'Pong', prompt: 'a pong game' },
  { emoji: '🟩', label: 'Platformer', prompt: 'a platformer where you jump across platforms' },
  { emoji: '🐦', label: 'Flappy', prompt: 'a flappy bird game' },
  { emoji: '🐍', label: 'Snake', prompt: 'a snake game' },
  { emoji: '🌀', label: 'Maze', prompt: 'a maze game where you find the exit' },
  { emoji: '🐱', label: 'Cat', prompt: 'a game with a cute cat hero' },
]

/** Read text aloud via the browser's speech synthesis (no LLM, on-device). */
function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}

/** Read a Blob as a base64 data URL (for the backend STT seam). */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Gemini-style landing entry for the kids' game Playground. A single glowing
 * prompt box (`.pg-glow` rotating brand-gradient halo) plus a game-name field and
 * picture starter chips, over the themed `.pg-canvas` vignette. Core UDL (OD-6):
 * read-aloud (speech synthesis) + voice/mic idea input (STT via backend, never a
 * direct LLM). A `ThemeToggle` sits top-right. Submits the trimmed prompt via
 * Enter (no Shift) or the send button, carrying the kid's game name.
 */
export function LandingScreen({ onSubmit }: { onSubmit: (prompt: string) => void }) {
  // Try-demo seam (try-demo-mode-prd §3 step 1): in the public demo the prompt is
  // pre-filled + locked (read-only textarea; chips/mic hidden so nothing can change
  // it), and the real `submit` is registered so the tour's "Create the game" drives
  // it. `useDemoMode()` is null everywhere else — behaviour identical outside /try.
  const demo = useDemoMode()
  const locked = !!demo?.lockedPrompt
  const [prompt, setPrompt] = useState(demo?.lockedPrompt ?? '')
  const [recording, setRecording] = useState(false)
  const recorderRef = useRef<MediaRecorder | null>(null)

  const submit = () => {
    const trimmed = prompt.trim()
    if (trimmed) onSubmit(trimmed)
  }

  const submitRef = useRef(submit)
  submitRef.current = submit
  useEffect(() => {
    demo?.bindLandingSubmit?.(() => submitRef.current())
  }, [demo])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  // Voice idea input (UDL / OD-6). The mic captures audio in the browser; the
  // audio is sent to the backend (`/llm/transcribe`) for STT — the kid surface
  // never calls a speech provider directly. The transcript fills the prompt box.
  const toggleVoice = async () => {
    if (recording) {
      recorderRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        setRecording(false)
        try {
          const audioDataUrl = await blobToDataUrl(new Blob(chunks, { type: recorder.mimeType }))
          const { text } = await transcribeVoice({ audioDataUrl })
          if (text) setPrompt((p) => (p ? `${p} ${text}` : text))
        } catch {
          // STT unreachable (backend not ready / offline) → keep typed input.
        }
      }
      recorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch {
      // Mic permission denied / unavailable → silently no-op (typing still works).
    }
  }

  return (
    <div
      data-testid="studio-root"
      className="pg-canvas relative flex min-h-screen flex-col items-center justify-center px-6"
    >
      {/* Theme switch */}
      <ThemeToggle className="absolute right-5 top-5" />

      {/* Wordmark */}
      <p className="mb-10 text-xl font-extrabold text-pg-text-dim">
        <span className="text-brand-sky">✦</span> Airbotix Playground
      </p>


      {/* Prompt box with animated glow halo */}
      <div className="pg-glow w-full max-w-3xl rounded-2xl">
        <div className="relative rounded-2xl bg-pg-surface p-5">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            readOnly={locked}
            placeholder="Describe a game and we'll build it…"
            aria-label="Describe a game"
            className="w-full resize-none bg-transparent text-lg text-pg-text placeholder:text-pg-text-muted focus:outline-none"
          />

          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            {/* Read-aloud (UDL): speaks the prompt help for non-readers. */}
            <button
              type="button"
              onClick={() => speak(prompt.trim() || 'Describe a game and we will build it.')}
              aria-label="Read aloud"
              data-testid="read-aloud"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-pg-border bg-pg-surface text-pg-text-dim transition-colors hover:border-brand-sky"
            >
              <Volume2 size={20} />
            </button>

            {/* Voice/mic idea input (UDL): records → backend STT → fills prompt.
                Hidden when the demo locks the prompt (it would change it). */}
            {!locked && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={recording ? 'Stop recording' : 'Speak your idea'}
              aria-pressed={recording}
              data-testid="voice-input"
              className={`flex h-11 w-11 items-center justify-center rounded-full border transition-colors ${
                recording
                  ? 'border-brand-coral bg-brand-coral/15 text-brand-coral'
                  : 'border-pg-border bg-pg-surface text-pg-text-dim hover:border-brand-sky'
              }`}
            >
              <Mic size={20} />
            </button>
            )}

            {/* Send button */}
            <button
              type="button"
              onClick={submit}
              disabled={!prompt.trim()}
              aria-label="Build game"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-sky text-xl text-canvas-pure transition-opacity disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Starter chips — hidden when the demo locks the prompt (they'd change it). */}
      {!locked && (
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        {STARTER_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            data-testid="starter-chip"
            onClick={() => setPrompt(chip.prompt)}
            className="rounded-full border border-pg-border bg-pg-surface px-4 py-2 text-sm font-bold text-pg-text transition-colors hover:border-brand-sky"
          >
            <span aria-hidden="true">{chip.emoji}</span> {chip.label}
          </button>
        ))}
      </div>
      )}
    </div>
  )
}
