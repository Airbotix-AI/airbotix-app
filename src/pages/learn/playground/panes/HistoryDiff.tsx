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
    <div className="flex h-full flex-col">
      {/* Before / After column labels, aligned to the diff's 50/50 split. */}
      <div className="flex shrink-0 border-b border-pg-border bg-pg-surface-2 text-[11px] font-bold">
        <div className="flex-1 items-center gap-1.5 border-r border-pg-border px-3 py-1">
          <span className="text-brand-coral">Before</span>
          <span className="ml-1.5 font-normal text-pg-text-muted">the older version</span>
        </div>
        <div className="flex-1 gap-1.5 px-3 py-1">
          <span className="text-brand-mint">After</span>
          <span className="ml-1.5 font-normal text-pg-text-muted">this version</span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
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
      </div>
    </div>
  )
}

export default HistoryDiff
