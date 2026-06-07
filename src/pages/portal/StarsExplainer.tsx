/**
 * Plain-language "what are Stars?" explainer for parents (especially low-IT).
 * Reused on the top-up page, the wallet, and anywhere a parent first meets Stars.
 *
 * Deliberately qualitative — no hard "A$X = Y Stars" conversion — so the copy
 * stays correct independent of the Stars pricing/economy (which is tuned in the
 * backend Model registry, not here). The one promise worth making concrete is
 * that failed attempts are refunded.
 */
export function StarsExplainer({
  kidName,
  className = '',
}: {
  kidName?: string;
  className?: string;
}) {
  const who = kidName ?? 'your child';
  return (
    <div className={`rounded-2xl border border-brand-mint/30 bg-wash-mint p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-[22px] leading-none">
          ⭐
        </span>
        <div>
          <div className="text-[15px] font-bold text-ink">What are Stars?</div>
          <p className="mt-1 text-[14px] leading-relaxed text-ink-soft">
            Stars are like pocket-money tokens for AI. Every time {who} makes something — a
            picture, a song, a story, a video, or a chat — it uses a few Stars. You&apos;re only
            charged for what&apos;s actually made (if a creation fails, the Stars come back). Top up
            any time; when Stars run low, creating pauses until you add more — so there are no
            surprise bills.
          </p>
        </div>
      </div>
    </div>
  );
}
