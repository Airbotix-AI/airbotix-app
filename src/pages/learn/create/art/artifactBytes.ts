// Same-origin artifact pixels (image-studio-prd D-IS-24): fetch the bytes
// through the API proxy (auth header) and hand back an object URL — the canvas
// can draw own artifacts with zero S3-CORS taint, and "use in my game" gets
// the exact pixels it re-uploads.

import { useQuery } from '@tanstack/react-query';

import { BASE_URL } from '@/lib/api';
import { surfacePrincipal, useAuthStore } from '@/auth/authStore';
import type { Artifact } from '../shared/useStudio';

export async function fetchArtifactBlob(artifact: Artifact): Promise<Blob> {
  const token = useAuthStore.getState().tokens[surfacePrincipal()];
  const res = await fetch(
    `${BASE_URL}/projects/${artifact.project_id}/artifacts/${artifact.id}/bytes`,
    { headers: token ? { Authorization: `Bearer ${token}` } : undefined },
  );
  if (!res.ok) throw new Error(`bytes ${res.status}`);
  return res.blob();
}

/** Object URL for an artifact's pixels via the same-origin proxy. */
export function useArtifactBlobUrl(artifact: Artifact | undefined): string | null {
  const query = useQuery<string>({
    queryKey: ['artifact-bytes', artifact?.id ?? 'none'],
    queryFn: async () => URL.createObjectURL(await fetchArtifactBlob(artifact as Artifact)),
    staleTime: Infinity,
    enabled: !!artifact,
  });
  return artifact ? (query.data ?? null) : null;
}
