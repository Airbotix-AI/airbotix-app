// Workshop-free-AI waiver badge (workshop-free-ai-prd.md D-WFA-01). Shown in a
// studio's generate button (and cost hints) in place of the "N★" cost when AI
// generation is FREE (0★) for the current project's live free-workshop window.
// Token-styled only (K-12 `wash-mint` + `ink`), never raw hex.

/** Small "Free" pill for inside a generate button label. */
export function FreeBadge() {
  return (
    <span className="rounded-full bg-wash-mint px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink">
      Free
    </span>
  );
}
