import { format, parseISO } from 'date-fns';

import { languageLabel, withPortalSrc, type ResourceGuideItem } from './resourceGuides';

// Tailwind needs the full class names statically (no runtime interpolation).
const CHIP_SKY = 'rounded-full bg-wash-sky px-2.5 py-0.5 text-[11px] font-bold text-ink';
const CHIP_MINT = 'rounded-full bg-wash-mint px-2.5 py-0.5 text-[11px] font-bold text-ink';
const CHIP_BUBBLEGUM = 'rounded-full bg-wash-bubblegum px-2.5 py-0.5 text-[11px] font-bold text-ink';

function verifiedLabel(lastVerified: string): string | null {
  try {
    return `Checked ${format(parseISO(lastVerified), 'd MMM yyyy')}`;
  } catch {
    return lastVerified ? `Checked ${lastVerified}` : null;
  }
}

/**
 * One Family Guide card (parent-portal-family-guides-prd §5.1): cover, title,
 * summary, location/age/language chips, verified date, featured badge. The card
 * body and the PDF button open the marketing-site pages in a NEW tab with the
 * `?src=portal` attribution param (D-PFG-02).
 */
export function GuideCard({ item, compact = false }: { item: ResourceGuideItem; compact?: boolean }) {
  const readUrl = withPortalSrc(item.htmlPath);
  const checked = verifiedLabel(item.lastVerified);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-hairline bg-canvas-pure shadow-card-soft">
      <a
        href={readUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-1 flex-col"
      >
        {!compact && item.coverImagePath && (
          <img
            src={item.coverImagePath}
            alt=""
            loading="lazy"
            className="h-40 w-full object-cover"
          />
        )}
        <div className="flex flex-1 flex-col p-5">
          {item.featured && (
            <div className="mb-2">
              <span className="rounded-full bg-wash-sunshine px-2.5 py-0.5 text-[11px] font-extrabold text-ink">
                ★ Featured
              </span>
            </div>
          )}
          <h2 className="text-[17px] font-bold leading-snug text-ink group-hover:underline">
            {item.title}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-slate2">{item.summary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.locations.map((location) => (
              <span key={location} className={CHIP_SKY}>
                {location}
              </span>
            ))}
            {item.ageStages.map((stage) => (
              <span key={stage} className={CHIP_MINT}>
                {stage}
              </span>
            ))}
            <span className={CHIP_BUBBLEGUM}>{languageLabel(item.language)}</span>
          </div>
          {checked && (
            <div className="mt-auto pt-3 text-[11px] font-bold uppercase tracking-[0.10em] text-slate2">
              {checked}
            </div>
          )}
        </div>
      </a>
      <div className="flex items-center justify-between border-t border-hairline px-5 py-3">
        <a
          href={readUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[13px] font-bold text-brand-sky"
        >
          Read guide →
        </a>
        <a
          href={withPortalSrc(item.pdfPath)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pill-ghost text-[13px]"
        >
          Download PDF
        </a>
      </div>
    </article>
  );
}
