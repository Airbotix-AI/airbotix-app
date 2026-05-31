import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import {
  approveTurn,
  getProject,
  readVfs,
  runAgentTurn,
  type AgentTurnResult,
  type CodeProject,
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
export function useCodeStudio(projectId: string) {
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
    queryFn: () => readVfs(projectId),
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
      if (e.code === 'MODERATION_REJECTED')
        return "Let's keep it kind and safe — try asking for something else.";
      if (e.code === 'MODERATION_WARN')
        return 'That message looked a bit off. Try saying it a different way.';
      return e.message;
    }
    return 'Could not reach the AI. Try again.';
  };

  // The turn id awaiting approval — set when the backend returns
  // `requires_approval`, cleared on approve/reject.
  const stagedTurnId = useRef<string | null>(null);

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

  /**
   * Send a kid message. The backend runs the agent loop and decides whether the
   * turn needs approval (`requires_approval`). When it does, we surface the
   * plan and gate the preview behind "✓ yes"; otherwise we apply it directly.
   */
  const send = useCallback(
    async (prompt: string) => {
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
        const res = await runAgentTurn({ projectId, prompt: text, mode });
        if (res.requires_approval) {
          stagedTurnId.current = res.turn_id;
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
          // Don't commit the preview until the kid approves the plan.
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
    [busy, projectId, mode, applyTurn],
  );

  /** Approve a staged plan ("✓ yes") — asks the backend to persist the turn. */
  const approvePlan = useCallback(async () => {
    const turnId = stagedTurnId.current;
    if (!turnId || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await approveTurn({ projectId, turnId, decision: 'approve' });
      applyTurn(res);
      stagedTurnId.current = null;
      setPendingPlan(null);
    } catch (e) {
      setError(friendly(e));
    } finally {
      setBusy(false);
    }
  }, [busy, projectId, applyTurn]);

  /** Reject a staged plan — tells the backend to discard the turn. */
  const rejectPlan = useCallback(async () => {
    const turnId = stagedTurnId.current;
    if (!turnId || busy) return;
    setError(null);
    setBusy(true);
    try {
      await approveTurn({ projectId, turnId, decision: 'reject' });
    } catch {
      // Even if the discard call fails, the un-approved writes were never
      // persisted server-side — drop the local staging regardless.
    } finally {
      stagedTurnId.current = null;
      setPendingPlan(null);
      setBusy(false);
      setChat((prev) => [
        ...prev,
        { id: `r${Date.now()}`, role: 'agent', text: 'No problem — nothing changed. Tell me what to do instead.' },
      ]);
    }
  }, [busy, projectId]);

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
