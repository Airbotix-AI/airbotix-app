import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';

import { getProject, readVfs, type CodeProject, type VfsFile } from './codeApi';
import { PreviewFrame } from './PreviewFrame';

/**
 * Standalone full-window iframe preview — `/learn/code/:projectId/run`
 * (learn-code-studio-prd.md §2.2). Used for "show parent / show class" mode.
 * Rendered as a top-level route (outside LearnLayout) so it fills the window.
 */
export function CodeRunPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const project = useQuery<CodeProject>({
    queryKey: ['code-project', projectId],
    queryFn: () => getProject(projectId!),
    enabled: !!projectId,
  });

  const vfs = useQuery<VfsFile[]>({
    queryKey: ['code-vfs', projectId],
    queryFn: () => readVfs(projectId!),
    enabled: !!projectId,
  });

  if (!projectId) return null;

  return (
    <div className="flex h-full flex-col bg-canvas">
      <div className="flex shrink-0 items-center justify-between border-b border-hairline bg-canvas-pure px-4 py-2">
        <span className="text-[14px] font-bold text-ink truncate">{project.data?.title ?? 'Preview'}</span>
        <Link to={`/learn/code/${projectId}`} className="btn-pill-ghost text-[12px]">
          ← Back to editing
        </Link>
      </div>
      <div className="flex-1 min-h-0">
        {vfs.data ? (
          <PreviewFrame files={vfs.data} runKey={0} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="lead-text">Loading…</span>
          </div>
        )}
      </div>
    </div>
  );
}
