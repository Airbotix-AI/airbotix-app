import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import {
  getProject,
  readVfs,
  runAgentTurn,
  type AgentTurnResult,
  type CodeProject,
  type CodeTemplateId,
  type FileChange,
  type VfsFile,
} from './codeApi';

export interface ChatItem {
  id: string;
  role: 'kid' | 'agent';
  text: string;
  stars?: number;
  changes?: FileChange[];
  toolsFired?: string[];
  pending?: boolean;
}

interface Wallet {
  stars_balance: number;
}

/** Shared controller for both Pro and Lite Code Studio layouts. */
export function useCodeStudio(projectId: string, template: CodeTemplateId = 'blank') {
  const me = useMe();
  const age = me.data?.kind === 'kid' ? (me.data.age ?? null) : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  // Mode: 8-11 → Lite, 12-17 → Pro. Default to Lite when age is unknown (safest UX).
  const mode: 'lite' | 'pro' = age != null && age >= 12 ? 'pro' : 'lite';

  const project = useQuery<CodeProject>({
    queryKey: ['code-project', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });

  const wallet = useQuery<Wallet>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<Wallet>(`/families/${familyId}/wallet`),
    enabled: !!familyId,
  });

  const [files, setFiles] = useState<VfsFile[] | null>(null);
  const vfs = useQuery<VfsFile[]>({
    queryKey: ['code-vfs', projectId],
    queryFn: () => readVfs(projectId, template),
    enabled: !!projectId,
  });
  const liveFiles = useMemo<VfsFile[]>(() => files ?? vfs.data ?? [], [files, vfs.data]);

  const [chat, setChat] = useState<ChatItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [runKey, setRunKey] = useState(0);
  // A staged plan awaiting "✓ yes" before multi-file edits land (PRD §4.1).
  const [pendingPlan, setPendingPlan] = useState<{ prompt: string } | null>(null);
  const idSeq = useRef(0);

  const nextId = () => `c${idSeq.current++}`;

  const balance = wallet.data?.stars_balance ?? 0;

  const friendly = (e: unknown): string => {
    if (e instanceof ApiError) {
      if (e.code === 'WALLET_INSUFFICIENT' || e.code === 'DAILY_CAP_EXCEEDED' || e.status === 402)
        return 'Out of Stars! Ask a parent to top up.';
      if (e.code === 'FAMILY_PAUSED') return 'Your family paused AI. Ask a parent.';
      return e.message;
    }
    return 'Could not reach the AI. Try again.';
  };

  const applyTurn = useCallback((res: AgentTurnResult) => {
    setFiles(res.files);
    setRunKey((k) => k + 1);
    setChat((prev) => [
      ...prev.filter((c) => !c.pending),
      {
        id: `a${Date.now()}`,
        role: 'agent',
        text: res.summary,
        stars: res.stars_charged,
        changes: res.changes,
        toolsFired: res.tools_fired,
      },
    ]);
  }, []);

  /** Send a kid message. In Pro mode a multi-file change first stages a plan. */
  const send = useCallback(
    async (prompt: string, opts?: { forceApprove?: boolean }) => {
      const text = prompt.trim();
      if (!text || busy) return;
      setError(null);
      setBusy(true);
      setChat((prev) => [
        ...prev,
        { id: nextId(), role: 'kid', text },
        { id: nextId(), role: 'agent', text: 'Thinking…', pending: true },
      ]);
      try {
        const res = await runAgentTurn({
          projectId,
          prompt: text,
          files: liveFiles,
          approvePlan: opts?.forceApprove ?? false,
          mode,
        });
        // Pro mode: if the turn touched >1 file, surface a plan/approve gate
        // unless the kid already approved (forceApprove).
        if (mode === 'pro' && !opts?.forceApprove && res.changes.length > 1) {
          setPendingPlan({ prompt: text });
          setChat((prev) => [
            ...prev.filter((c) => !c.pending),
            {
              id: `p${Date.now()}`,
              role: 'agent',
              text:
                res.plan?.plan_text ??
                `Plan: I'll edit ${res.changes.map((c) => c.path).join(', ')}. Shall I?`,
              changes: res.changes,
              toolsFired: res.tools_fired,
            },
          ]);
          // Stage the proposed files but don't commit the preview until approved.
          stagedRef.current = res;
          setBusy(false);
          return;
        }
        applyTurn(res);
      } catch (e) {
        setChat((prev) => prev.filter((c) => !c.pending));
        setError(friendly(e));
      } finally {
        setBusy(false);
      }
    },
    [busy, projectId, liveFiles, mode, applyTurn],
  );

  const stagedRef = useRef<AgentTurnResult | null>(null);

  /** Approve a staged plan ("✓ yes") — commits the previously-computed turn. */
  const approvePlan = useCallback(() => {
    if (!stagedRef.current) return;
    applyTurn(stagedRef.current);
    stagedRef.current = null;
    setPendingPlan(null);
  }, [applyTurn]);

  const rejectPlan = useCallback(() => {
    stagedRef.current = null;
    setPendingPlan(null);
    setChat((prev) => [
      ...prev,
      { id: `r${Date.now()}`, role: 'agent', text: 'No problem — nothing changed. Tell me what to do instead.' },
    ]);
  }, []);

  const runAnew = useCallback(() => setRunKey((k) => k + 1), []);

  const title = project.data?.title ?? 'Loading…';

  return useMemo(
    () => ({
      mode,
      age,
      title,
      files: liveFiles,
      loading: vfs.isLoading || project.isLoading,
      chat,
      busy,
      error,
      balance,
      runKey,
      pendingPlan,
      send,
      approvePlan,
      rejectPlan,
      runAnew,
      visibility: project.data?.visibility ?? 'private',
    }),
    [
      mode, age, title, liveFiles, vfs.isLoading, project.isLoading, project.data,
      chat, busy, error, balance, runKey, pendingPlan, send, approvePlan, rejectPlan, runAnew,
    ],
  );
}
