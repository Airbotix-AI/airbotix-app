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
}

/** Shared controller for both Pro and Lite Code Studio layouts. */
export function useCodeStudio(projectId: string, opts: CodeStudioOptions = {}) {
  const me = useMe();
  const age = me.data?.kind === 'kid' ? (me.data.age ?? null) : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

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
  const [warnPending, setWarnPending] = useState<{ message: string; prompt: string; stage: string; categories?: string[] } | null>(null);
  const [runKey, setRunKey] = useState(0);
  // D-PI8: PII categories acked in this session — re-occurrences skip the modal.
  const ackedPiiCategories = useRef(new Set<string>());
  // D-PI8: prompt queued for a silent auto-retry (all categories already acked).
  const autoRetryRef = useRef<string | null>(null);
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
  // D-PI8: when busy goes false and autoRetryRef is set, silently re-send without
  // showing the modal (all PII categories were already acked earlier this session).
  useEffect(() => {
    if (!busy && autoRetryRef.current !== null) {
      const p = autoRetryRef.current;
      autoRetryRef.current = null;
      // _skipKidBubble: the kid message is already in the chat from the original send.
      void send(p, { piiWarnAcknowledged: true, _skipKidBubble: true });
    }
  }, [busy]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(
    async (prompt: string, opts: { piiWarnAcknowledged?: boolean; _skipKidBubble?: boolean } = {}) => {
      const text = prompt.trim();
      if (!text || busy) return;
      setError(null);
      setWarnPending(null);
      setBusy(true);
      if (opts._skipKidBubble) {
        // D-PI8 auto-retry: kid bubble already in chat; only add the thinking placeholder.
        setChat((prev) => [...prev, { id: nextId(), role: 'agent', text: 'Thinking…', pending: true }]);
      } else {
        setChat((prev) => [
          ...prev,
          { id: nextId(), role: 'kid', text },
          { id: nextId(), role: 'agent', text: 'Thinking…', pending: true },
        ]);
      }
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
          const details = e.details as { kind?: string; categories?: string[] } | undefined;
          const stage = details?.kind === 'pii_warn' ? 'pii_detector' : 'topic_classifier';
          const categories = details?.categories ?? [];
          // D-PI8: if every detected PII category was already acked this session, skip the modal.
          const allAcked =
            details?.kind === 'pii_warn' &&
            categories.length > 0 &&
            categories.every((c) => ackedPiiCategories.current.has(c));
          if (allAcked) {
            autoRetryRef.current = text; // useEffect fires auto-retry when busy→false
          } else {
            setWarnPending({ message: e.message, prompt: text, stage, categories });
          }
        } else {
          setError(friendly(e));
        }
      } finally {
        setBusy(false);
      }
    },
    [busy, projectId, mode, applyTurn],
  );

  const confirmWarn = useCallback(async () => {
    if (!warnPending || busy) return;
    const { prompt, categories } = warnPending;
    // D-PI8: remember which categories were acked so re-occurrences skip the modal.
    categories?.forEach((c) => ackedPiiCategories.current.add(c));
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
      warnPending,
      balance,
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
      mode, age, title, liveFiles, vfs.isLoading, project.isLoading, project.data,
      chat, busy, error, warnPending, balance, runKey, pendingPlan, send, approvePlan, rejectPlan, runAnew, confirmWarn, dismissWarn,
    ],
  );
}
