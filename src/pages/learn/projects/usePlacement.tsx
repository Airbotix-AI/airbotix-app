import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updatePlacement, type PlacementAction } from '../classroom/classroomApi';
import { placementOf, type KidProject } from './kidProject';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Shared placement orchestration for `WorkCard` (my-classes-prd §3.2). Wires the
 * three `PATCH /projects/:id/placement` actions, the destructive-action confirm
 * for "Move to Personal", and exposes the project chosen for "Share with the
 * whole class" (the existing wall-post path the caller owns).
 *
 * Returns the per-card handler factory + the modal/dialog node to render once.
 */
export function usePlacement({
  kidId,
  onShareRequest,
}: {
  kidId: string | null;
  /** Caller opens the existing wall-share modal for this project. */
  onShareRequest: (project: KidProject) => void;
}) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<KidProject | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] });
    qc.invalidateQueries({ queryKey: ['kid', kidId, 'classes'] });
  };

  const move = useMutation({
    mutationFn: (args: { projectId: string; action: PlacementAction; classId?: string }) =>
      updatePlacement(args),
    onSuccess: () => {
      setConfirm(null);
      invalidate();
    },
  });

  function handlers(p: KidProject) {
    return {
      onUseForClass: (classId: string) =>
        move.mutate({ projectId: p.id, action: 'use_for_class', classId }),
      onTakeOffWall: () => move.mutate({ projectId: p.id, action: 'take_off_wall' }),
      onShareWithClass: () => onShareRequest(p),
      // Destructive when on-wall / teacher-seen: confirm first (§3.2 caveat).
      onMoveToPersonal: () => setConfirm(p),
    };
  }

  const node = confirm ? (
    <ConfirmDialog
      title="Move to your Personal space?"
      body={
        placementOf(confirm) === 'on_wall'
          ? 'This takes it off the class wall and makes it private. Your classmates won’t see it anymore.'
          : 'This makes it private. Your teacher won’t be able to see it to help anymore.'
      }
      confirmLabel="Move to Personal"
      busy={move.isPending}
      onConfirm={() => move.mutate({ projectId: confirm.id, action: 'move_to_personal' })}
      onCancel={() => setConfirm(null)}
    />
  ) : null;

  return { handlers, dialog: node };
}
