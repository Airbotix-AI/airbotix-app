import { useState } from 'react';
import { Link } from 'react-router-dom';

import {
  LIVE_CREATE_TOOLS,
  type CreateTool,
  type ParentStudioGuide,
} from '@/pages/learn/create/createTools';

const GUIDE_ACTION = {
  open: 'See the parent guide',
  close: 'Hide the parent guide',
} as const;

function ParentGuide({ guide }: { guide: ParentStudioGuide }) {
  return (
    <div className="mt-5 border-t border-hairline pt-5" data-testid="parent-guide-content">
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <div className="text-[12px] font-black uppercase tracking-[0.08em] text-slate2">
            What your child does
          </div>
          <ol className="mt-3 space-y-3">
            {guide.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-[13px] leading-relaxed text-ink-soft">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-black text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="space-y-5">
          <div>
            <div className="text-[12px] font-black uppercase tracking-[0.08em] text-slate2">
              What they practise
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {guide.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-hairline bg-canvas-pure px-3 py-1.5 text-[11px] font-bold text-ink"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[12px] font-black uppercase tracking-[0.08em] text-slate2">
              AI and Stars
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{guide.aiAndStars}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-wash-sunshine px-4 py-3">
        <div className="text-[11px] font-black uppercase tracking-[0.08em] text-slate2">
          Ask them afterwards
        </div>
        <p className="mt-1 text-[14px] font-bold text-ink">“{guide.parentPrompt}”</p>
      </div>
    </div>
  );
}

function StudioCard({ studio }: { studio: CreateTool }) {
  const [expanded, setExpanded] = useState(false);
  const guide = studio.parentGuide;
  const guideId = `parent-guide-${studio.id}`;

  return (
    <article
      className="rounded-2xl border border-hairline bg-surface p-5"
      data-testid={`parent-studio-${studio.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[28px]" aria-hidden="true">
          {studio.emoji}
        </div>
        <span className={`sticker-${studio.color}`}>{studio.discoveryLabel}</span>
      </div>
      <h3 className="mt-3 text-[20px] font-bold text-ink">{studio.title}</h3>
      <p className="mt-1 text-[14px] leading-relaxed text-slate2">{studio.parentDesc}</p>

      {guide && (
        <>
          <dl className="mt-4 space-y-3 rounded-2xl bg-canvas-pure p-4">
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.08em] text-slate2">
                Good fit for
              </dt>
              <dd className="mt-1 text-[13px] font-semibold leading-relaxed text-ink">
                {guide.bestFor}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-black uppercase tracking-[0.08em] text-slate2">
                What they can make
              </dt>
              <dd className="mt-1 text-[13px] font-semibold leading-relaxed text-ink">
                {guide.outcome}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={guideId}
            onClick={() => setExpanded((value) => !value)}
            className="mt-4 w-full rounded-full border-2 border-ink px-4 py-2.5 text-[13px] font-black text-ink transition hover:bg-ink hover:text-white"
          >
            {expanded ? GUIDE_ACTION.close : GUIDE_ACTION.open}
          </button>
          {expanded && (
            <div id={guideId}>
              <ParentGuide guide={guide} />
            </div>
          )}
        </>
      )}

      <p className="mt-4 text-[12px] font-bold text-ink-soft">Find it: {studio.learnPath}</p>
    </article>
  );
}

export function CreativeSpacesPanel() {
  return (
    <section className="card-base" data-testid="parent-creative-spaces">
      <div className="eyebrow eyebrow-mint">Parent guide</div>
      <h2 className="section-heading mt-1" style={{ fontSize: '28px' }}>
        Which creative space fits your child?
      </h2>
      <p className="lead-text mt-3" style={{ fontSize: '15px' }}>
        Compare what your child will make, how they learn, where AI helps and what you can ask them
        afterwards. These spaces live inside your child&apos;s Learn account; nothing starts from
        this parent page.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LIVE_CREATE_TOOLS.map((studio) => (
          <StudioCard key={studio.id} studio={studio} />
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
