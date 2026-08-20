import { Link } from 'react-router-dom';

import type { CreatorPassport, PassportEvidence } from './creatorPassport';
import { CAPABILITY_COPY } from './creatorPassport';

const STATUS_COPY: Record<PassportEvidence['status'], string> = {
  draft: 'Draft',
  submitted: 'Waiting for teacher review',
  needs_another_try: 'Add one more piece of evidence',
  verified: 'Verified',
};

export function CreatorPassportView({
  passport,
  projectHref = (projectId) => `/learn/projects/${projectId}`,
}: {
  passport: CreatorPassport;
  projectHref?: (projectId: string) => string;
}) {
  const activeCodes = new Set(
    passport.evidence
      .filter((item) => item.status === 'verified' && item.award && !item.award.revoked_at)
      .map((item) => item.definition.code),
  );

  return (
    <div className="space-y-8" data-testid="creator-passport-view">
      <section className="card-base overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="sticker-sunshine inline-flex">Creator Passport</p>
            <h1 className="section-heading mt-4">{passport.kid.nickname}&apos;s creator journey</h1>
            <p className="lead-text mt-2 max-w-2xl">
              Every verified stamp links to a real project, the creator&apos;s own explanation and a
              teacher&apos;s evidence check.
            </p>
          </div>
          <div className="rounded-3xl bg-wash-sky px-5 py-4 text-center">
            <div className="text-3xl font-extrabold text-ink">
              {passport.showcase_eligibility.unique_capability_count}/5
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate2">
              abilities verified
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="capability-heading">
        <div className="mb-4">
          <h2 id="capability-heading" className="section-heading">
            Capability stamps
          </h2>
          <p className="lead-text mt-1">A stamp is earned from evidence, never attendance alone.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(CAPABILITY_COPY).map(([code, copy]) => {
            const verified = activeCodes.has(code as keyof typeof CAPABILITY_COPY);
            return (
              <article
                key={code}
                className={`card-base border-2 p-5 ${
                  verified ? 'border-brand-mint bg-wash-mint' : 'border-hairline bg-canvas-pure'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-extrabold text-ink">{copy.label}</h3>
                  <span className={verified ? 'sticker-mint' : 'sticker-sky'}>
                    {verified ? 'Verified' : 'Still growing'}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{copy.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <ShowcaseStatus passport={passport} />

      <section aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="section-heading">
          Evidence timeline
        </h2>
        <p className="lead-text mt-1">Open the project behind every capability decision.</p>
        {passport.evidence.length === 0 ? (
          <div className="card-base mt-4 p-7 text-center">
            <p className="font-bold text-ink">No Workshop evidence yet</p>
            <p className="mt-2 text-sm text-ink-soft">
              The first submitted project reflection will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {passport.evidence.map((item) => (
              <article key={item.id} className="card-base p-5" data-testid="passport-evidence">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-extrabold text-ink">
                      {item.definition.display_name}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">
                      {item.class.name} · {new Date(item.submitted_at).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <span
                    className={
                      item.award?.revoked_at
                        ? 'sticker-bubblegum'
                        : item.status === 'verified'
                          ? 'sticker-mint'
                          : 'sticker-sunshine'
                    }
                  >
                    {item.award?.revoked_at ? 'Stamp revoked' : STATUS_COPY[item.status]}
                  </span>
                </div>
                <blockquote className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm leading-6 text-ink">
                  “{item.child_reflection.text}”
                </blockquote>
                {item.teacher_note && (
                  <p className="mt-3 text-sm text-ink-soft">
                    <span className="font-bold text-ink">Teacher note:</span> {item.teacher_note}
                  </p>
                )}
                {item.return_reason && (
                  <p className="mt-3 rounded-2xl bg-wash-sunshine px-4 py-3 text-sm text-ink">
                    Next evidence to add: {item.return_reason}
                  </p>
                )}
                <Link to={projectHref(item.project.id)} className="btn-pill-ghost mt-4 inline-flex">
                  Open “{item.project.title}” →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function ShowcaseStatus({ passport }: { passport: CreatorPassport }) {
  const eligibility = passport.showcase_eligibility;
  if (eligibility.status === 'eligible') {
    return (
      <section className="card-base border-2 border-brand-sunshine bg-wash-sunshine p-6">
        <p className="sticker-sunshine inline-flex">Showcase ready</p>
        <h2 className="mt-3 text-xl font-extrabold text-ink">
          Eligible for a Showcase Day invitation
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Eligibility is not automatic registration. A parent still confirms participation, and
          public display or media use needs separate permission.
        </p>
      </section>
    );
  }

  return (
    <section className="card-base bg-wash-bubblegum p-6">
      <p className="sticker-bubblegum inline-flex">Growing toward Showcase Day</p>
      <h2 className="mt-3 text-xl font-extrabold text-ink">Build breadth and project depth</h2>
      <p className="mt-2 text-sm leading-6 text-ink-soft">
        The pathway needs four different capabilities including Project Presenter, backed by two
        projects from two Workshops. Repeating a capability still shows growth, but does not replace
        breadth.
      </p>
    </section>
  );
}
