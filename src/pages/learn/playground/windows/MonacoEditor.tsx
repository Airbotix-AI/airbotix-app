import { loader, default as Editor } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

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
      }
    }
  }
).typescript.javascriptDefaults
jsDefaults.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false })

interface MonacoEditorProps {
  value: string
  onChange: (v: string) => void
  language?: string
}

function MonacoEditor({ value, onChange, language = 'javascript' }: MonacoEditorProps) {
  return (
    <Editor
      height="100%"
      theme="vs-dark"
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      options={{
        minimap: { enabled: false },
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
