import { Link } from 'react-router-dom';

import { LIVE_CREATE_TOOLS } from '@/pages/learn/create/createTools';

export function CreativeSpacesPanel() {
  return (
    <section className="card-base" data-testid="parent-creative-spaces">
      <div className="eyebrow eyebrow-mint">Creative spaces</div>
      <h2 className="section-heading mt-1" style={{ fontSize: '28px' }}>
        Four places your child can start creating
      </h2>
      <p className="lead-text mt-3" style={{ fontSize: '15px' }}>
        These are inside your child&apos;s Learn account. They will see all four on their home
        screen as soon as they sign in.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LIVE_CREATE_TOOLS.map((studio) => (
          <article
            key={studio.id}
            className="rounded-2xl border border-hairline bg-surface p-5"
            data-testid={`parent-studio-${studio.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-[28px]" aria-hidden="true">
                {studio.emoji}
              </div>
              <span className={`sticker-${studio.color}`}>{studio.discoveryLabel}</span>
            </div>
            <h3 className="mt-3 text-[19px] font-bold text-ink">{studio.title}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-slate2">{studio.parentDesc}</p>
            <p className="mt-4 text-[12px] font-bold text-ink-soft">{studio.learnPath}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-wash-mint px-5 py-4">
        <div className="min-w-[220px] flex-1">
          <div className="text-[14px] font-bold text-ink">Need to get your child into Learn?</div>
          <div className="mt-1 text-[13px] text-slate2">
            My Family shows the family code and each child&apos;s sign-in details.
          </div>
        </div>
        <Link to="/portal/family" className="btn-pill-primary shrink-0">
          Open My Family →
        </Link>
      </div>
    </section>
  );
}
