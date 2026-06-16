import { Link } from 'react-router-dom';
import { Users, X } from 'lucide-react';

import { CREATE_TOOLS } from '../create/createTools';

/**
 * In-place "Create for this class" sheet (my-classes-prd §3.3, D-MC-9). Opens
 * inside the class hub — NOT a jump to the Create tab. New work made here is
 * MEANT to default to 👩‍🏫 class work (teacher-visible). Picking a tool opens
 * its studio.
 *
 * TODO(D-MC-11): show only course-allowed kinds ∩ kid topic_limits once the
 * backend `CoursePack.allowed_kinds` exists. For now it shows the kid's full
 * permitted tool set, framed for class context.
 *
 * TODO(my-classes class_id pass-through): the tool links currently route to the
 * bare studio route (e.g. `/learn/create/image`) with NO class context, so work
 * created here is NOT yet auto-attached to the class — the "default to class
 * work" promise is unwired until the studios accept a class_id (and the backend
 * `PATCH /projects/:id/placement` / project-create-with-class contract lands).
 * Deferred deliberately on this FE-only diff; the copy below is intentionally
 * framed as intent ("can see it to help"), not a guarantee.
 */
export function CreateForClassSheet({
  className,
  onClose,
}: {
  className: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="card-base w-full max-w-md"
        data-testid="create-for-class-sheet"
      >
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="eyebrow eyebrow-bubblegum">Make for this class</div>
            <h2 className="text-[22px] font-bold text-ink">{className} · pick a tool</h2>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface text-slate2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-wash-sunshine px-4 py-3">
          <Users size={18} className="text-ink" />
          <p className="text-[13px] text-ink">
            <b>Class work</b> — your teacher can see it to help.
          </p>
        </div>

        <div className="space-y-2.5">
          {CREATE_TOOLS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              onClick={onClose}
              className="flex items-center gap-3 rounded-2xl border border-hairline bg-canvas-pure p-3.5 transition-transform hover:-translate-y-0.5 hover:shadow-card-soft"
              data-testid="create-tool"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-xl bg-grad-${t.color} text-[24px]`}>
                {t.emoji}
              </span>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-ink">{t.title}</div>
                <div className="text-[12px] text-slate2">{t.desc}</div>
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-slate2">
                {t.cost === 0 ? 'Free' : `${t.cost}★`}
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-3 text-[12px] text-slate2">
          For free-time projects, use the{' '}
          <Link to="/learn/create" className="font-bold text-brand-coral">
            Create tab
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
