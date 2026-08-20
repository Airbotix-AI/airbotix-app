import { Check, LockKeyhole } from 'lucide-react';

import type { CreatorCapabilityCode, PassportEvidence } from './creatorPassport';
import { CAPABILITY_COPY } from './creatorPassport';
import { CAPABILITY_VISUALS } from './creatorPassportVisuals';

export function CreatorPassportStamp({
  code,
  evidence,
}: {
  code: CreatorCapabilityCode;
  evidence: PassportEvidence | undefined;
}) {
  const copy = CAPABILITY_COPY[code];
  const visual = CAPABILITY_VISUALS[code];
  const verified = !!evidence;
  const { Icon } = visual;

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={`text-[11px] font-extrabold tracking-[0.18em] ${visual.accentClass}`}>
          STAMP {visual.number}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] ${
            verified ? visual.statusClass : 'bg-canvas-pure text-slate2'
          }`}
        >
          {verified ? (
            <Check size={13} strokeWidth={3} aria-hidden="true" />
          ) : (
            <LockKeyhole size={12} aria-hidden="true" />
          )}
          {verified ? 'Earned' : 'Next quest'}
        </span>
      </div>

      <div className="my-5 grid place-items-center">
        <div
          className={`grid h-32 w-32 place-items-center rounded-full border-2 border-dashed p-2 transition-transform duration-200 group-hover:scale-105 ${
            verified
              ? `${visual.sealClass} ${visual.tiltClass}`
              : 'border-stone2 bg-canvas-pure text-steel'
          }`}
        >
          <div className="grid h-full w-full place-items-center rounded-full border-2 border-current/50">
            <Icon size={48} strokeWidth={2.2} aria-hidden="true" />
          </div>
        </div>
      </div>

      <h3 className="text-center text-xl font-extrabold text-ink">{copy.label}</h3>
      <p className="mt-2 text-center text-[13px] font-medium leading-5 text-ink-soft">
        {copy.description}
      </p>
      <p
        className={`mt-4 text-center text-[11px] font-extrabold uppercase tracking-[0.1em] ${visual.accentClass}`}
      >
        {verified ? `See evidence · ${evidence.project.title}` : 'Build it · explain it · prove it'}
      </p>
    </>
  );

  const className = `group block h-full rounded-[32px] border-2 p-5 transition-transform duration-200 ${
    verified
      ? `${visual.cardClass} hover:-translate-y-1 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand-sky`
      : 'border-dashed border-hairline bg-surface opacity-75'
  }`;

  return verified ? (
    <a
      href={`#passport-evidence-${evidence.id}`}
      className={className}
      aria-label={`${copy.label} earned. See evidence from ${evidence.project.title}.`}
      data-testid="creator-passport-stamp"
      data-stamp-state="earned"
    >
      {content}
    </a>
  ) : (
    <article className={className} data-testid="creator-passport-stamp" data-stamp-state="locked">
      {content}
    </article>
  );
}
