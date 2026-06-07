// Shared Monaco bootstrap — self-hosted workers (no CDN, platform rule) + the
// lenient kid diagnostics. Imported by BOTH the code editor (MonacoEditor) and
// the lazy history diff (HistoryDiff) so the heavy monaco-editor bundle lives in
// their shared lazy chunk (never the main bundle) and is configured exactly once.

import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string): Worker {
    if (label === 'typescript' || label === 'javascript') {
      return new tsWorker()
    }
    return new editorWorker()
  },
}

// Use the locally-bundled monaco instead of the default CDN. Module scope = once.
loader.config({ monaco })

// Lenient diagnostics for kids: surface syntax errors, suppress the noisier
// semantic/type complaints. Global (one TS service), so it covers editor + diff.
// (monaco's bundled .d.ts stubs `languages.typescript`; cast to reach the runtime API.)
export const jsDefaults = (
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

export { monaco }
