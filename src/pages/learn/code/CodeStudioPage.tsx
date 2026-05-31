import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { CodeChat } from './CodeChat';
import { FileTree } from './FileTree';
import { PreviewFrame } from './PreviewFrame';
import { useCodeStudio } from './useCodeStudio';

export function CodeStudioPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const studio = useCodeStudio(projectId ?? '');

  if (!projectId) return <NotFound />;
  if (studio.loading) {
    return (
      <div className="flex h-full items-center justify-center bg-canvas">
        <span className="lead-text">Opening your code…</span>
      </div>
    );
  }

  const awaitingApproval = studio.pendingPlan !== null;

  return studio.mode === 'pro' ? (
    <ProLayout projectId={projectId} studio={studio} awaitingApproval={awaitingApproval} />
  ) : (
    <LiteLayout projectId={projectId} studio={studio} awaitingApproval={awaitingApproval} />
  );
}

type Studio = ReturnType<typeof useCodeStudio>;

function StudioHeader({
  projectId,
  title,
  balance,
  visibility,
  onRunAnew,
}: {
  projectId: string;
  title: string;
  balance: number;
  visibility: string;
  onRunAnew: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline bg-canvas-pure px-4 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <Link to="/learn/create/code" className="btn-pill-ghost -ml-2 text-[13px]">
          ← My code
        </Link>
        <span className="text-[15px] font-bold text-ink truncate">{title}</span>
        <span className="hidden sm:inline rounded-full bg-wash-mint px-2.5 py-0.5 text-[11px] font-bold text-ink">
          💾 Auto-saved
        </span>
        {visibility !== 'private' && (
          <span className="rounded-full bg-wash-sky px-2.5 py-0.5 text-[11px] font-bold text-ink">{visibility}</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[13px] font-bold tabular-nums text-ink">⭐ {balance}</span>
        <button onClick={onRunAnew} className="btn-pill-secondary text-[12px]">
          ▶ Run anew
        </button>
        <Link to={`/learn/code/${projectId}/run`} target="_blank" className="btn-pill-ghost text-[12px]">
          ⤢ Full screen
        </Link>
      </div>
    </div>
  );
}

// ── Pro layout (12-17): Files | Chat | Preview, resizable ──────────────────

function ProLayout({
  projectId,
  studio,
  awaitingApproval,
}: {
  projectId: string;
  studio: Studio;
  awaitingApproval: boolean;
}) {
  const [activePath, setActivePath] = useState<string | null>(studio.files[0]?.path ?? null);

  return (
    <div className="flex h-full flex-col bg-canvas">
      <StudioHeader
        projectId={projectId}
        title={studio.title}
        balance={studio.balance}
        visibility={studio.visibility}
        onRunAnew={studio.runAnew}
      />
      <div className="flex flex-1 min-h-0">
        {/* Files */}
        <aside className="hidden lg:block w-56 shrink-0 overflow-y-auto border-r border-hairline bg-canvas-pure">
          <FileTree files={studio.files} activePath={activePath} onPick={setActivePath} />
        </aside>

        {/* Chat */}
        <section className="flex-1 min-w-0 border-r border-hairline">
          <CodeChat
            chat={studio.chat}
            busy={studio.busy}
            balance={studio.balance}
            error={studio.error}
            awaitingApproval={awaitingApproval}
            onSend={(t) => studio.send(t)}
            onApprove={studio.approvePlan}
            onReject={studio.rejectPlan}
          />
        </section>

        {/* Preview */}
        <section className="flex-[1.2] min-w-0 hidden md:block">
          <PreviewFrame
            files={studio.files}
            runKey={studio.runKey}
            showConsole
            onFixError={(msg) => studio.send(`Fix this error: ${msg}`)}
          />
        </section>
      </div>
    </div>
  );
}

// ── Lite layout (8-11): big preview + chat below + files drawer ────────────

function LiteLayout({
  projectId,
  studio,
  awaitingApproval,
}: {
  projectId: string;
  studio: Studio;
  awaitingApproval: boolean;
}) {
  const [showFiles, setShowFiles] = useState(false);
  const [activePath, setActivePath] = useState<string | null>(studio.files[0]?.path ?? null);

  return (
    <div className="flex h-full flex-col bg-canvas">
      <StudioHeader
        projectId={projectId}
        title={studio.title}
        balance={studio.balance}
        visibility={studio.visibility}
        onRunAnew={studio.runAnew}
      />
      <div className="flex flex-1 min-h-0 flex-col">
        {/* Big preview */}
        <div className="h-[45%] min-h-0 border-b border-hairline">
          <PreviewFrame files={studio.files} runKey={studio.runKey} />
        </div>

        {/* Chat + Show files */}
        <div className="flex-1 min-h-0 relative">
          <CodeChat
            chat={studio.chat}
            busy={studio.busy}
            balance={studio.balance}
            error={studio.error}
            awaitingApproval={awaitingApproval}
            lite
            onSend={(t) => studio.send(t)}
            onApprove={studio.approvePlan}
            onReject={studio.rejectPlan}
          />
          <button
            onClick={() => setShowFiles(true)}
            className="absolute right-3 top-3 rounded-full bg-surface px-3 py-1.5 text-[12px] font-bold text-ink-soft hover:bg-wash-sky hover:text-ink transition-colors"
          >
            📁 Show files
          </button>
        </div>
      </div>

      {showFiles && (
        <div className="fixed inset-0 z-30 flex" role="dialog" aria-modal="true">
          <button
            className="flex-1 bg-ink/30"
            aria-label="Close files"
            onClick={() => setShowFiles(false)}
          />
          <div className="w-72 bg-canvas-pure shadow-card-soft overflow-y-auto">
            <div className="flex items-center justify-between px-4 py-3 border-b border-hairline">
              <span className="text-[14px] font-bold text-ink">Your files</span>
              <button onClick={() => setShowFiles(false)} className="btn-pill-ghost text-[12px]">
                Close
              </button>
            </div>
            <FileTree files={studio.files} activePath={activePath} onPick={setActivePath} compact />
          </div>
        </div>
      )}
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <div className="eyebrow">Code Studio</div>
      <h1 className="section-heading">Project not found</h1>
      <Link to="/learn/create/code" className="btn-pill-secondary mt-6">
        ← Back to Code Studio
      </Link>
    </div>
  );
}
