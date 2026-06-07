import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';

export interface Wallet {
  stars_balance: number;
  daily_used: number;
  daily_cap: number;
  paused: boolean;
}

export interface Artifact {
  id: string;
  kind: 'image' | 'audio' | 'video' | 'text' | 'code_file' | 'project_export';
  s3_key: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  project_id: string;
  metadata: { prompt?: string; source?: string } | Record<string, unknown>;
}

export interface MediaResult {
  id: string;
  url: string;
  mime_type: string;
  stars_charged: number;
  balance_after: number;
  artifact_id: string | null;
}

export function useKidWallet() {
  const me = useMe();
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;
  return useQuery<Wallet>({
    queryKey: ['wallet', familyId],
    queryFn: () => api<Wallet>(`/families/${familyId}/wallet`),
    enabled: !!familyId,
  });
}

export function useRecentArtifacts(kind: 'image' | 'audio' | 'video') {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  return useQuery<Artifact[]>({
    queryKey: ['kid', kidId, 'artifacts', kind],
    queryFn: () => api<Artifact[]>(`/kids/${kidId}/artifacts?kind=${kind}`),
    enabled: !!kidId,
  });
}

export function useGenerate(endpoint: 'image' | 'tts' | 'music' | 'video') {
  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const kindForCache: 'image' | 'audio' | 'video' =
    endpoint === 'image' ? 'image' : endpoint === 'video' ? 'video' : 'audio';

  return useMutation<MediaResult, ApiError, Record<string, unknown>>({
    mutationFn: (body) =>
      api<MediaResult>(`/llm/${endpoint}`, { method: 'POST', body }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['wallet', familyId] }),
        qc.invalidateQueries({ queryKey: ['kid', kidId, 'artifacts', kindForCache] }),
      ]);
    },
  });
}

export function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'WALLET_INSUFFICIENT' || e.code === 'DAILY_CAP_EXCEEDED')
      return 'Out of Stars! Ask a parent to top up.';
    if (e.code === 'FAMILY_PAUSED') return 'Your family paused AI. Ask a parent.';
    if (e.code === 'FAMILY_REQUIRED') return 'You need a family first.';
    if (e.code === 'PAYLOAD_TOO_LARGE') return 'This file is too big — try a smaller one. No Stars were charged.';
    return e.message;
  }
  return 'Could not reach AI.';
}
