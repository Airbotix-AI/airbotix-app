/** Generic kid-friendly confirm dialog (my-classes-prd §3.2 destructive guard). */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="card-base w-full max-w-sm p-5 text-ink"
        data-testid="confirm-dialog"
      >
        <h2 className="text-[17px] font-extrabold">{title}</h2>
        <p className="mt-2 text-[13.5px] text-steel">{body}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-hairline px-4 py-2 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-50"
            data-testid="confirm-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-lg bg-brand-coral px-4 py-2 text-[13px] font-extrabold text-white disabled:opacity-70"
            data-testid="confirm-ok"
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
