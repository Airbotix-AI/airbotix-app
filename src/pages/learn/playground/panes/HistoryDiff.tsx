// Lazy Monaco DiffEditor for the history panel — left = the historical version
// (read-only "peek"), right = the current version. Lazy-loaded (own chunk via the
// shared monacoSetup) so the diff view never bloats the main bundle.

import { DiffEditor } from '@monaco-editor/react'

import { usePlaygroundStore } from '../playgroundStore'
import './monacoSetup' // self-hosted workers + loader config (side effect)

interface HistoryDiffProps {
  original: string
  modified: string
  language: string
}

function HistoryDiff({ original, modified, language }: HistoryDiffProps) {
  const theme = usePlaygroundStore((s) => s.theme)
  return (
    <DiffEditor
      height="100%"
      theme={theme === 'dark' ? 'vs-dark' : 'vs'}
      language={language}
      original={original}
      modified={modified}
      options={{
        readOnly: true,
        renderSideBySide: true,
        minimap: { enabled: false },
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 13,
        scrollBeyondLastLine: false,
        automaticLayout: true,
      }}
    />
  )
}

export default HistoryDiff
