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

export interface CodeStudioOptions {
  /**
   * Force Pro layout regardless of age. Mission `widget: code` steps always run
   * in Pro mode — Mission authoring decided the right scaffold (code-studio-prd §7).
   */
  forcePro?: boolean;
  /**
   * Read-only viewing mode (teacher-live-project-view-prd D-LV-6). A teacher
   * watches a kid's project live: the SAME studio layout renders from the loaded
   * VFS, but EVERY mutation entry point is gated (send / approve / reject are
   * no-ops) and the kid-only wallet query is skipped (a teacher has no family —
   * balance shows "—"). The hard backstop is the backend write-guard; this is the
   * UX layer over it. `runAnew` / preview stay live (non-destructive viewing).
   */
  readOnly?: boolean;
}

/** Shared controller for both Pro and Lite Code Studio layouts. */
export function useCodeStudio(projectId: string, opts: CodeStudioOptions = {}) {
  const readOnly = opts.readOnly ?? false;
  const me = useMe();
  const age = me.data?.kind === 'kid' ? (me.data.age ?? null) : null;
  // In read-only mode the principal is a teacher (`user`), not a kid — there is no
  // family/wallet. Force `familyId` null so the kid-only wallet query never fires
  // (it would 403/404 for a teacher) and the balance renders as hidden ("—").
  const familyId = !readOnly && me.data?.kind === 'kid' ? me.data.family_id : null;

  // Mode: 8-11 → Lite, 12-17 → Pro. Default to Lite when age is unknown (safest
  // UX). Mission code steps force Pro (code-studio-prd §7).
  const mode: 'lite' | 'pro' = opts.forcePro || (age != null && age >= 12) ? 'pro' : 'lite';

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
  const [warnPending, setWarnPending] = useState<{ message: string; prompt: string; stage: string } | null>(null);
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
    async (prompt: string, opts: { piiWarnAcknowledged?: boolean } = {}) => {
      if (readOnly) return; // teacher viewer — no AI turns (D-LV-6)
      const text = prompt.trim();
      if (!text || busy) return;
      setError(null);
      setWarnPending(null);
      setBusy(true);
      setChat((prev) => [
        ...prev,
        { id: nextId(), role: 'kid', text },
        { id: nextId(), role: 'agent', text: 'Thinking…', pending: true },
      ]);
      try {
        const res = await runAgentTurn({ projectId, prompt: text, mode, piiWarnAcknowledged: opts.piiWarnAcknowledged });
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
          return;
        }
        applyTurn(res);
      } catch (e) {
        setChat((prev) => prev.filter((c) => !c.pending));
        if (e instanceof ApiError && e.code === 'MODERATION_WARN') {
          const details = e.details as { kind?: string } | undefined;
          const stage = details?.kind === 'pii_warn' ? 'pii_detector' : 'topic_classifier';
          setWarnPending({ message: e.message, prompt: text, stage });
        } else {
          setError(friendly(e));
        }
      } finally {
        setBusy(false);
      }
    },
    [readOnly, busy, projectId, mode, applyTurn],
  );

  const confirmWarn = useCallback(async () => {
    if (!warnPending || busy) return;
    const { prompt } = warnPending;
    setWarnPending(null);
    await send(prompt, { piiWarnAcknowledged: true });
  }, [warnPending, busy, send]);

  const dismissWarn = useCallback(() => {
    if (warnPending) {
      void api<void>('/safety/prompt-aborted', {
        method: 'POST',
        body: { surface: 'code', stage: warnPending.stage },
        principal: 'kid',
      }).catch(() => undefined);
    }
    setWarnPending(null);
  }, [warnPending]);

  /** Approve a staged plan ("✓ yes") — asks the backend to persist the turn. */
  const approvePlan = useCallback(async () => {
    if (readOnly) return; // teacher viewer — cannot approve a kid's plan (D-LV-6)
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
  }, [readOnly, busy, projectId, applyTurn]);

  /** Reject a staged plan — tells the backend to discard the turn. */
  const rejectPlan = useCallback(async () => {
    if (readOnly) return; // teacher viewer — no plan to reject (D-LV-6)
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
  }, [readOnly, busy, projectId]);

  const runAnew = useCallback(() => setRunKey((k) => k + 1), []);

  const title = project.data?.title ?? 'Loading…';

  return useMemo(
    () => ({
      mode,
      age,
      title,
      readOnly,
      files: liveFiles,
      loading: vfs.isLoading || project.isLoading,
      chat,
      busy,
      error,
      warnPending,
      // A teacher viewer has no wallet — surface null so the UI hides the balance
      // ("—") rather than showing the kid a misleading 0★ (D-LV-6).
      balance: readOnly ? null : balance,
      runKey,
      pendingPlan,
      send,
      approvePlan,
      rejectPlan,
      runAnew,
      confirmWarn,
      dismissWarn,
      visibility: project.data?.visibility ?? 'private',
    }),
    [
      mode, age, title, readOnly, liveFiles, vfs.isLoading, project.isLoading, project.data,
      chat, busy, error, warnPending, balance, runKey, pendingPlan, send, approvePlan, rejectPlan, runAnew, confirmWarn, dismissWarn,
    ],
  );
}
