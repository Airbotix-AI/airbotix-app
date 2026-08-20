import { CalendarDays, ExternalLink, MessageCircle, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { CreatorCapabilityCode, CreatorPassport, PassportEvidence } from './creatorPassport';
import { CAPABILITY_COPY } from './creatorPassport';
import { CreatorPassportCover } from './CreatorPassportCover';
import { CreatorPassportShowcase } from './CreatorPassportShowcase';
import { CreatorPassportStamp } from './CreatorPassportStamp';
import { CAPABILITY_VISUALS } from './creatorPassportVisuals';

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
  const capabilityCodes = Object.keys(CAPABILITY_COPY) as CreatorCapabilityCode[];
  const verifiedEvidence = new Map<CreatorCapabilityCode, PassportEvidence>();
  passport.evidence.forEach((item) => {
    if (item.status === 'verified' && item.award && !item.award.revoked_at) {
      verifiedEvidence.set(item.definition.code, item);
    }
  });

  return (
    <div className="space-y-10" data-testid="creator-passport-view">
      <CreatorPassportCover
        nickname={passport.kid.nickname}
        verifiedCount={verifiedEvidence.size}
      />

      <section aria-labelledby="capability-heading">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-handwritten text-2xl font-bold text-brand-bubblegum">
              Your stamp collection
            </p>
            <h2 id="capability-heading" className="section-heading">
              Capability stamps
            </h2>
          </div>
          <p className="max-w-md text-[13px] font-semibold leading-5 text-ink-soft sm:text-right">
            Every colourful stamp opens the project, your explanation and your teacher&apos;s check.
            Attendance alone never earns one.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {capabilityCodes.map((code) => (
            <CreatorPassportStamp key={code} code={code} evidence={verifiedEvidence.get(code)} />
          ))}
        </div>
      </section>

      <CreatorPassportShowcase passport={passport} />

      <section aria-labelledby="evidence-heading">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-sky text-ink shadow-brand-sky">
            <ShieldCheck size={25} aria-hidden="true" />
          </div>
          <div>
            <h2 id="evidence-heading" className="section-heading">
              Evidence journal
            </h2>
            <p className="text-[14px] font-medium text-ink-soft">
              The story and real project behind every stamp.
            </p>
          </div>
        </div>
        {passport.evidence.length === 0 ? (
          <div className="card-base mt-6 border-2 border-dashed border-brand-sky p-8 text-center">
            <p className="font-bold text-ink">No Workshop evidence yet</p>
            <p className="mt-2 text-sm text-ink-soft">
              The first submitted project reflection will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {passport.evidence.map((item) => {
              const visual = CAPABILITY_VISUALS[item.definition.code];
              const { Icon } = visual;
              return (
                <article
                  id={`passport-evidence-${item.id}`}
                  key={item.id}
                  className="card-base scroll-mt-24 overflow-hidden border-2 border-hairline p-0"
                  data-testid="passport-evidence"
                >
                  <div
                    className={`flex items-center gap-4 border-b-2 border-hairline px-5 py-4 ${visual.backgroundClass}`}
                  >
                    <div
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${visual.sealClass}`}
                    >
                      <Icon size={24} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-extrabold text-ink">
                        {item.definition.display_name}
                      </p>
                      <p className="truncate text-[12px] font-bold uppercase tracking-[0.07em] text-slate2">
                        {item.project.title}
                      </p>
                    </div>
                    <span
                      className={
                        item.award?.revoked_at
                          ? 'sticker-bubblegum shrink-0'
                          : item.status === 'verified'
                            ? 'sticker-mint shrink-0'
                            : 'sticker-sunshine shrink-0'
                      }
                    >
                      {item.award?.revoked_at ? 'Stamp revoked' : STATUS_COPY[item.status]}
                    </span>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-soft">
                        <CalendarDays size={16} className="text-brand-sky" aria-hidden="true" />
                        {item.class.name} ·{' '}
                        {new Date(item.submitted_at).toLocaleDateString('en-AU')}
                      </p>
                    </div>
                    <blockquote className="mt-4 rounded-2xl bg-surface px-4 py-4 text-sm leading-6 text-ink">
                      <MessageCircle
                        className="mb-2 text-brand-bubblegum"
                        size={20}
                        aria-hidden="true"
                      />
                      “{item.child_reflection.text}”
                    </blockquote>
                    {item.teacher_note && (
                      <p className="mt-3 rounded-2xl bg-wash-mint px-4 py-3 text-sm text-ink-soft">
                        <span className="font-bold text-ink">Teacher note:</span>{' '}
                        {item.teacher_note}
                      </p>
                    )}
                    {item.return_reason && (
                      <p className="mt-3 rounded-2xl bg-wash-sunshine px-4 py-3 text-sm text-ink">
                        Next evidence to add: {item.return_reason}
                      </p>
                    )}
                    <Link
                      to={projectHref(item.project.id)}
                      className="btn-pill-secondary mt-5 inline-flex gap-2"
                    >
                      Open “{item.project.title}” <ExternalLink size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
