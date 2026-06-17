import { useState } from 'react';

import { surfacePrincipal, useAuthStore } from '@/auth/authStore';
import { ApiError, BASE_URL } from '@/lib/api';

export function useMusicUpload(projectId: string | null) {
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  async function save(
    blob: Blob,
    filename: string,
    meta: { source: string; title: string; track?: string; score_version?: number },
  ): Promise<string> {
    if (!projectId) throw new Error('No project — start a music session first.');

    setSaving((s) => ({ ...s, [filename]: true }));
    try {
      const token = useAuthStore.getState().tokens[surfacePrincipal()];
      const form = new FormData();
      form.append('file', blob, filename);
      form.append('kind', 'audio');
      form.append('metadata', JSON.stringify(meta));

      const res = await fetch(`${BASE_URL}/projects/${projectId}/artifacts/upload-buffer`, {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
        credentials: 'include',
        body: form,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { message?: string; code?: string };
        throw new ApiError(res.status, payload.code ?? 'UPLOAD_FAILED', payload.message ?? 'Upload failed.');
      }

      const artifact = (await res.json()) as { id: string };
      return artifact.id;
    } finally {
      setSaving((s) => ({ ...s, [filename]: false }));
    }
  }

  return { save, saving };
}
