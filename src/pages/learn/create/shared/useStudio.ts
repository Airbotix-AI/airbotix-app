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

// The standalone Create-tab tools that own a system bucket
// (learn-create-studio-save-prd.md §5.1 — mirrors backend BUCKET_TOOLS).
export type CreateBucketTool = 'image' | 'music' | 'voice' | 'video';

/**
 * Resolve (get-or-create) the kid's per-tool system bucket — the project this
 * studio's generations auto-save into (My Pictures / My Songs / My Voice /
 * My Videos). Idempotent on the backend, so retries and re-mounts are safe.
 */
export function useCreateBucket(tool: CreateBucketTool) {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  return useQuery<{ project_id: string; title: string }>({
    queryKey: ['kid', kidId, 'create-bucket', tool],
    queryFn: () =>
      api<{ project_id: string; title: string }>(`/kids/${kidId}/create-buckets/resolve`, {
        method: 'POST',
        body: { tool },
      }),
    enabled: !!kidId,
    staleTime: Infinity,
  });
}

/**
 * The studio's Recent grid = the bucket's contents (D-CSS-03). Bucket-level
 * reads keep the two audio tools (music vs voice) separate, which the old
 * `/kids/:id/artifacts?kind=audio` query could not.
 */
export function useBucketArtifacts(bucketId: string | undefined) {
  return useQuery<Artifact[]>({
    queryKey: ['bucket-artifacts', bucketId],
    queryFn: () => api<Artifact[]>(`/projects/${bucketId}/artifacts`),
    enabled: !!bucketId,
  });
}

/** Signed download URL for one artifact — a proper query so components stay render-pure. */
export function useArtifactUrl(artifact: Artifact, enabled = true) {
  return useQuery<string>({
    queryKey: ['artifact-url', artifact.id],
    queryFn: () =>
      api<{ url: string }>(
        `/projects/${artifact.project_id}/artifacts/${artifact.id}/download-url`,
        { method: 'POST' },
      ).then((r) => r.url),
    staleTime: 5 * 60 * 1000,
    enabled: enabled && !!artifact.id && artifact.id !== 'none',
  });
}

export function useGenerate(endpoint: 'image' | 'tts' | 'music' | 'video', projectId?: string) {
  const me = useMe();
  const qc = useQueryClient();
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  return useMutation<MediaResult, ApiError, Record<string, unknown>>({
    mutationFn: (body) =>
      api<MediaResult>(`/llm/${endpoint}`, {
        method: 'POST',
        // Generations persist into the studio's bucket (learn-create-studio-save-prd
        // §5.3) — without a project_id the backend saves nothing and the work is lost.
        // The hook-bound bucket id is the DEFAULT; an explicit per-call
        // project_id (Art Studio mission mode) wins.
        body: { ...(projectId ? { project_id: projectId } : {}), ...body },
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['wallet', familyId] }),
        qc.invalidateQueries({ queryKey: ['bucket-artifacts', projectId] }),
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
