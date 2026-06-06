import { loader, default as Editor } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { useEffect, useRef } from 'react'

import { usePlaygroundStore } from '../playgroundStore'

// Self-host Monaco workers (platform rule: no CDN). Vite `?worker` imports are
// bundled locally and instantiated here based on the language label.
self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

// Force @monaco-editor/react to use the locally bundled monaco-editor instead
// of fetching it from the default CDN. Module scope = runs exactly once.
loader.config({ monaco })

// Lenient diagnostics for kids: surface syntax errors, but suppress the noisier
// semantic/type complaints that aren't useful for beginner JavaScript.
// (monaco-editor's bundled .d.ts stubs `languages.typescript`; the API exists at
// runtime in the full bundle, so cast to reach it.)
const jsDefaults = (
  monaco.languages as unknown as {
    typescript: {
      javascriptDefaults: {
        setDiagnosticsOptions: (o: { noSemanticValidation: boolean; noSyntaxValidation: boolean }) => void
        addExtraLib: (content: string, filePath?: string) => void
      }
    }
  }
).typescript.javascriptDefaults
jsDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false })

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
const PHASER_DTS_URL = '/vendor/phaser-3.80.1.d.ts'
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
}

function MonacoEditor({ value, onChange, language = 'javascript', onCursorChange, jumpTo }: MonacoEditorProps) {
  // Follow the playground theme: light editor in light mode, vs-dark in dark.
  const theme = usePlaygroundStore((s) => s.theme)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  // Jump to a line on request. The model is already updated (the value-sync
  // effect of the inner <Editor> is a child effect, so it runs before this
  // parent effect), so revealing/positioning here lands on the new content.
  useEffect(() => {
    const ed = editorRef.current
    if (!ed || !jumpTo) return
    ed.revealLineInCenter(jumpTo.line)
    ed.setPosition({ lineNumber: jumpTo.line, column: jumpTo.column ?? 1 })
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
        // A pending jump (requested before mount) lands once the editor exists.
        if (jumpTo) {
          editor.revealLineInCenter(jumpTo.line)
          editor.setPosition({ lineNumber: jumpTo.line, column: jumpTo.column ?? 1 })
        }
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
      }}
    />
  )
}

export default MonacoEditor
