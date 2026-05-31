import { useState } from 'react';

import { ShareToClassModal } from './ShareToClassModal';

interface MissionShareStepProps {
  projectId: string;
  /**
   * Mission steps complete the moment the share is *submitted*, not approved
   * (learn-classroom-prd §3.3 / QC-6). The runner passes this to mark the step
   * done as soon as the ShareRequest is created.
   */
  onComplete: () => void;
}

/**
 * Mission `share_to_class` widget (learn-classroom-prd.md §3.3 +
 * learn-missions-prd §3.2). Drop into a mission step runner; completing the
 * share creates a ShareRequest (via ShareToClassModal) and marks the step done.
 */
export function MissionShareStep({ projectId, onComplete }: MissionShareStepProps) {
  const [open, setOpen] = useState(false);
  const [shared, setShared] = useState(false);

  return (
    <div className="card-base">
      <div className="eyebrow eyebrow-sky">Mission step</div>
      <h3 className="text-[18px] font-bold text-ink mt-1">Share your work with the class</h3>
      <p className="lead-text mt-2" style={{ fontSize: '14px' }}>
        Show your classmates what you made. Your teacher checks it first.
      </p>

      {shared ? (
        <div className="mt-4 rounded-2xl bg-wash-mint border border-brand-mint/30 px-4 py-3 text-[13px] font-medium text-ink">
          ✓ Sent! This step is done — your teacher will say yes soon.
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="btn-pill-primary mt-4">
          ✨ Share with class
        </button>
      )}

      {open && (
        <ShareToClassModal
          projectId={projectId}
          onClose={() => setOpen(false)}
          onShared={() => {
            setShared(true);
            onComplete();
          }}
        />
      )}
    </div>
  );
}
