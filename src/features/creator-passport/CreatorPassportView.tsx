import {
  BookOpenCheck,
  CalendarDays,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
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
  const evidenceByProject = Array.from(
    passport.evidence
      .reduce((groups, item) => {
        const existing = groups.get(item.project.id);
        if (existing) existing.items.push(item);
        else groups.set(item.project.id, { project: item.project, items: [item] });
        return groups;
      }, new Map<string, { project: PassportEvidence['project']; items: PassportEvidence[] }>())
      .values(),
  );

  return (
    <div className="space-y-8 sm:space-y-10" data-testid="creator-passport-view">
      <CreatorPassportCover
        nickname={passport.kid.nickname}
        verifiedCount={verifiedEvidence.size}
      />

      <section
        aria-labelledby="capability-heading"
        className="rounded-[28px] border border-hairline bg-canvas-pure p-4 shadow-card-soft sm:p-6 lg:rounded-[32px]"
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-5">
          {capabilityCodes.map((code) => (
            <CreatorPassportStamp key={code} code={code} evidence={verifiedEvidence.get(code)} />
          ))}
        </div>
      </section>

      <CreatorPassportShowcase passport={passport} />

      <section aria-labelledby="evidence-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-sky text-ink shadow-brand-sky">
              <ShieldCheck size={25} aria-hidden="true" />
            </div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-sky">
                Proof behind the stamps
              </p>
              <h2 id="evidence-heading" className="section-heading">
                Evidence journal
              </h2>
              <p className="text-[14px] font-medium text-ink-soft">
                Your own words, real projects and teacher checks — kept together.
              </p>
            </div>
          </div>
          {passport.evidence.length > 0 && (
            <div className="inline-flex self-start rounded-full bg-surface px-4 py-2 text-[12px] font-extrabold text-ink-soft sm:self-auto">
              {passport.evidence.length} checks · {evidenceByProject.length}{' '}
              {evidenceByProject.length === 1 ? 'project' : 'projects'}
            </div>
          )}
        </div>
        {passport.evidence.length === 0 ? (
          <div className="card-base mt-6 border-2 border-dashed border-brand-sky p-8 text-center">
            <p className="font-bold text-ink">No Workshop evidence yet</p>
            <p className="mt-2 text-sm text-ink-soft">
              The first submitted project reflection will appear here.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid items-start gap-4 lg:grid-cols-2">
            {evidenceByProject.map(({ project, items }) => {
              const first = items[0];
              return (
                <article
                  key={project.id}
                  className="overflow-hidden rounded-[28px] border-2 border-hairline bg-canvas-pure shadow-card-soft"
                  data-testid="passport-project-evidence"
                >
                  <div className="flex items-center gap-3 border-b-2 border-hairline bg-ink px-5 py-4 text-canvas">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-sunshine text-ink">
                      <BookOpenCheck size={22} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-extrabold text-canvas">{project.title}</p>
                      <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-canvas/60">
                        <CalendarDays size={13} aria-hidden="true" />
                        {first.class.name} ·{' '}
                        {new Date(first.submitted_at).toLocaleDateString('en-AU')}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-canvas">
                      {items.length} {items.length === 1 ? 'skill' : 'skills'}
                    </span>
                  </div>
                  <div className="divide-y divide-hairline px-5">
                    {items.map((item) => {
                      const visual = CAPABILITY_VISUALS[item.definition.code];
                      const { Icon } = visual;
                      return (
                        <div
                          id={`passport-evidence-${item.id}`}
                          key={item.id}
                          className="scroll-mt-24 py-5"
                          data-testid="passport-evidence"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${visual.sealClass}`}
                            >
                              <Icon size={20} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-extrabold text-ink">
                                {item.definition.display_name}
                              </h3>
                              <p className="text-[11px] font-semibold text-slate2">
                                {new Date(item.submitted_at).toLocaleDateString('en-AU')}
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
                          <blockquote className="mt-3 rounded-2xl bg-surface px-4 py-3 text-[13px] font-medium leading-5 text-ink">
                            <MessageCircle
                              className="mb-1.5 text-brand-bubblegum"
                              size={17}
                              aria-hidden="true"
                            />
                            “{item.child_reflection.text}”
                          </blockquote>
                          {item.teacher_note && (
                            <p className="mt-2 text-[12px] leading-5 text-ink-soft">
                              <span className="font-extrabold text-ink">Teacher check:</span>{' '}
                              {item.teacher_note}
                            </p>
                          )}
                          {item.return_reason && (
                            <p className="mt-2 rounded-xl bg-wash-sunshine px-3 py-2 text-[12px] text-ink">
                              Next evidence to add: {item.return_reason}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t-2 border-hairline bg-surface px-5 py-4">
                    <Link
                      to={projectHref(project.id)}
                      className="inline-flex items-center gap-2 text-[13px] font-extrabold text-ink hover:text-brand-bubblegum"
                    >
                      Open “{project.title}” <ExternalLink size={15} aria-hidden="true" />
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
