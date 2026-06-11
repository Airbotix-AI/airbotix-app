import { default as Editor } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'

import { usePlaygroundStore } from '../playgroundStore'
import { jsDefaults, monaco } from './monacoSetup'

// Phaser IntelliSense: load the vendored Phaser .d.ts into the JS language
// service so kids get hover docs, ⌘/Ctrl-click go-to-definition, and `Phaser.`
// autocomplete on the global `Phaser` namespace. Semantic *validation* stays off
// (above) so completion/hover/definition work WITHOUT nagging red squiggles.
//
// Self-hosted + lazy: fetched from `/vendor/` (no CDN, platform rule) the first
// time any editor mounts, never bundled into the app JS. The ~6 MB file is
// parsed by the TS worker on its own thread. We strip the leading
// `/// <reference types="./matter" />` — it points at Matter physics types we
// don't vendor, and a dangling reference would fail to resolve.
const PHASER_DTS_URL = '/vendor/phaser-4.1.0.d.ts'
let phaserTypesLoaded = false
async function loadPhaserTypes(): Promise<void> {
  if (phaserTypesLoaded) return
  phaserTypesLoaded = true
  try {
    const res = await fetch(PHASER_DTS_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const dts = (await res.text()).replace(/^\/\/\/\s*<reference[^>]*>\s*$/gm, '')
    jsDefaults.addExtraLib(dts, 'phaser.d.ts')
  } catch {
    // Non-fatal: the editor still works, just without Phaser IntelliSense.
    phaserTypesLoaded = false
  }
}

export interface CursorPosition {
  line: number
  column: number
}

/** A request to move the caret + scroll to a line (e.g. jumping to a console
 *  error). `nonce` makes repeat jumps to the same line re-fire the effect. */
export interface JumpTarget {
  line: number
  /** When set, highlight the inclusive [line, toLine] range (agent highlight_code). */
  toLine?: number
  column?: number
  nonce: number
}

interface MonacoEditorProps {
  value: string
  onChange: (v: string) => void
  language?: string
  /** Reports the caret position for the editor status bar (1-based Ln/Col). */
  onCursorChange?: (pos: CursorPosition) => void
  /** Reveal + place the caret at a line (jump-to-error). Re-fires when nonce changes. */
  jumpTo?: JumpTarget | null
  /** Hand the selected code to the AI chat ("✨ Explain this" floating toolbar).
   *  When unset the toolbar never shows. */
  onExplainSelection?: (code: string) => void
}

function MonacoEditor({ value, onChange, language = 'javascript', onCursorChange, jumpTo, onExplainSelection }: MonacoEditorProps) {
  // Follow the playground theme: light editor in light mode, vs-dark in dark.
  const theme = usePlaygroundStore((s) => s.theme)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  // Keep the latest callback reachable from the once-registered widget without
  // re-mounting it when the prop identity changes.
  const onExplainRef = useRef(onExplainSelection)
  onExplainRef.current = onExplainSelection

  // Hover / suggest / parameter-hint widgets are "overflow widgets". By default
  // Monaco renders them INSIDE the editor DOM, so they get clipped by the code
  // window's `overflow:hidden` (rounded corners) — and the window's react-rnd
  // `transform` traps even position:fixed widgets. Render them into a body-level
  // node instead (`overflowWidgetsDomNode` + `fixedOverflowWidgets`), so a long
  // doc tooltip escapes the window and shows fully on top. The node carries the
  // `monaco-editor` class so the widget CSS + active (global) theme apply.
  const overflowNodeRef = useRef<HTMLDivElement | null>(null)
  if (overflowNodeRef.current === null && typeof document !== 'undefined') {
    const node = document.createElement('div')
    node.className = 'monaco-editor'
    node.style.zIndex = '100000' // above the floating windows
    overflowNodeRef.current = node
  }
  useEffect(() => {
    const node = overflowNodeRef.current
    if (!node) return
    document.body.appendChild(node)
    return () => node.remove()
  }, [])

  // Decorations for the agent's highlight_code range (cleared on the next jump,
  // or as soon as the kid clicks into the code — see onMouseDown in onMount).
  const highlightRef = useRef<string[]>([])

  // The "✨ Explain this" floating toolbar: a Monaco content widget anchored to a
  // non-empty selection. Built as a content widget (not a React overlay) so Monaco
  // anchors it to the selection and flips it above/below near the top edge for us.
  // Clicking it hands the selected code to the chat agent (onExplainSelection).
  const setupExplainToolbar = (editor: monaco.editor.IStandaloneCodeEditor) => {
    let selection: monaco.Selection | null = null
    let visible = false

    const node = document.createElement('div')
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('data-testid', 'explain-selection')
    // A rounded-rectangle chip that matches the AI chat: same sky gradient + white
    // text + brand-sky glow + extrabold type as the kid bubble / send button, at the
    // softer `rounded-xl` (a rectangle, not the old circle). `whitespace-nowrap` is
    // load-bearing — without it Monaco's narrow content-widget box wraps the label
    // and the chip balloons. `my-1` keeps a gap above/below the selection. Literal
    // class string → Tailwind JIT picks the utilities up.
    btn.className =
      'my-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-grad-sky px-3 py-1.5 text-[12px] font-extrabold leading-none text-white shadow-brand-sky ring-1 ring-white/25 transition-transform duration-150 hover:-translate-y-0.5'
    // Twinkling sparkle = the playground's "magical" motif (the same `pg-twinkle`
    // the Magic Generation card uses). Inline SVG, not the ✨ emoji (renders large/
    // inconsistently across platforms).
    btn.innerHTML =
      '<svg class="pg-twinkle" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2l1.65 5.35L19 9l-5.35 1.65L12 16l-1.65-5.35L5 9l5.35-1.65z"/></svg>' +
      '<span>Explain this</span>'
    node.appendChild(btn)

    const widget: monaco.editor.IContentWidget = {
      getId: () => 'airbotix.explain.toolbar',
      getDomNode: () => node,
      getPosition: () =>
        visible && selection
          ? {
              position: { lineNumber: selection.startLineNumber, column: selection.startColumn },
              preference: [
                monaco.editor.ContentWidgetPositionPreference.ABOVE,
                monaco.editor.ContentWidgetPositionPreference.BELOW,
              ],
            }
          : null,
    }
    editor.addContentWidget(widget)

    const hide = () => {
      if (!visible) return
      visible = false
      editor.layoutContentWidget(widget)
    }

    // mousedown would blur/move the caret and collapse the selection before the
    // click fires — preventDefault keeps the selection intact for the handler.
    btn.addEventListener('mousedown', (e) => e.preventDefault())
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const model = editor.getModel()
      if (!selection || !model) return
      const code = model.getValueInRange(selection)
      if (code.trim()) onExplainRef.current?.(code)
      hide()
    })

    editor.onDidChangeCursorSelection((e) => {
      if (e.selection.isEmpty() || !onExplainRef.current) {
        selection = null
        hide()
        return
      }
      selection = e.selection
      visible = true
      editor.layoutContentWidget(widget)
    })
  }

  // Jump to a line on request. The model is already updated (the value-sync
  // effect of the inner <Editor> is a child effect, so it runs before this
  // parent effect), so revealing/positioning here lands on the new content.
  useEffect(() => {
    const ed = editorRef.current
    if (!ed || !jumpTo) return
    ed.revealLineInCenter(jumpTo.line)
    ed.setPosition({ lineNumber: jumpTo.line, column: jumpTo.column ?? 1 })
    // highlight_code: flag the [line, toLine] range so the kid sees exactly what
    // the agent changed. A plain jump (no toLine) clears any prior highlight.
    const end = jumpTo.toLine && jumpTo.toLine >= jumpTo.line ? jumpTo.toLine : null
    highlightRef.current = ed.deltaDecorations(
      highlightRef.current,
      end
        ? [
            {
              range: new monaco.Range(jumpTo.line, 1, end, 1),
              options: { isWholeLine: true, className: 'pg-code-highlight' },
            },
          ]
        : [],
    )
    ed.focus()
  }, [jumpTo])

  return (
    <Editor
      height="100%"
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      onMount={(editor) => {
        editorRef.current = editor
        // Lazy-load Phaser IntelliSense the first time an editor opens.
        void loadPhaserTypes()
        const report = () => {
          const p = editor.getPosition()
          if (p) onCursorChange?.({ line: p.lineNumber, column: p.column })
        }
        report()
        editor.onDidChangeCursorPosition(report)
        // The agent's "here's what changed" highlight steps out of the way the
        // moment the kid clicks into the code — they're now exploring/editing, so
        // the emphasis shouldn't linger. It returns next time a change row is tapped.
        editor.onMouseDown(() => {
          if (highlightRef.current.length) {
            highlightRef.current = editor.deltaDecorations(highlightRef.current, [])
          }
        })
        // A pending jump (requested before mount) lands once the editor exists.
        if (jumpTo) {
          editor.revealLineInCenter(jumpTo.line)
          editor.setPosition({ lineNumber: jumpTo.line, column: jumpTo.column ?? 1 })
        }
        setupExplainToolbar(editor)
      }}
      options={{
        // `showSlider: 'always'` keeps the viewport rectangle visible so it
        // tracks scrolling (the default 'mouseover' only shows it on hover).
        minimap: { enabled: true, showSlider: 'always' },
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        // Render hover/suggest widgets in the body-level node so they aren't
        // clipped by the window (see overflowNodeRef above).
        fixedOverflowWidgets: true,
        overflowWidgetsDomNode: overflowNodeRef.current ?? undefined,
      }}
    />
  )
}

export default MonacoEditor
