import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { useWsEvent } from '@/lib/useWsEvent';
import { listFamilyShareLinks, type FamilyShareLink } from '@/pages/learn/playground/sharingApi';

interface ApprovalLite {
  status: string;
}

export function usePortalPendingApprovals(): number {
  const me = useMe();
  const queryClient = useQueryClient();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const approvals = useQuery<ApprovalLite[]>({
    queryKey: ['approvals', familyId],
    queryFn: () => api<ApprovalLite[]>(`/families/${familyId}/approvals`),
    enabled: !!familyId,
  });
  const shareLinks = useQuery<FamilyShareLink[]>({
    queryKey: ['share-requests', familyId],
    queryFn: () => listFamilyShareLinks(familyId!),
    enabled: !!familyId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['approvals', familyId] });
    queryClient.invalidateQueries({ queryKey: ['share-requests', familyId] });
  };
  useWsEvent('approval.new', invalidate, [familyId]);
  useWsEvent('approval.resolved', invalidate, [familyId]);

  return (
    (approvals.data?.filter((approval) => approval.status === 'pending').length ?? 0) +
    (shareLinks.data?.filter((shareLink) => shareLink.status === 'pending').length ?? 0)
  );
}
