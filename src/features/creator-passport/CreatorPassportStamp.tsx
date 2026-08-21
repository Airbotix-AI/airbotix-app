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
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-[9px] font-extrabold tracking-[0.16em] sm:text-[11px] ${visual.accentClass}`}
        >
          STAMP {visual.number}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[8px] font-extrabold uppercase tracking-[0.06em] sm:px-3 sm:text-[10px] ${
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

      <div className="my-3 grid place-items-center sm:my-5">
        <div
          className={`grid h-20 w-20 place-items-center rounded-full border-2 border-dashed p-1.5 transition-transform duration-200 group-hover:scale-105 sm:h-28 sm:w-28 sm:p-2 xl:h-32 xl:w-32 ${
            verified
              ? `${visual.sealClass} ${visual.tiltClass}`
              : 'border-stone2 bg-canvas-pure text-steel'
          }`}
        >
          <div className="grid h-full w-full place-items-center rounded-full border-2 border-current/50">
            <Icon
              className="h-8 w-8 sm:h-11 sm:w-11 xl:h-12 xl:w-12"
              strokeWidth={2.2}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      <h3 className="text-center text-[15px] font-extrabold leading-tight text-ink sm:text-lg xl:text-xl">
        {copy.label}
      </h3>
      <p className="mt-1.5 text-center text-[11px] font-medium leading-4 text-ink-soft sm:mt-2 sm:text-[12px] sm:leading-5 xl:text-[13px]">
        {copy.description}
      </p>
      <p
        className={`mt-3 line-clamp-2 text-center text-[9px] font-extrabold uppercase leading-4 tracking-[0.08em] sm:mt-4 sm:text-[10px] xl:text-[11px] ${visual.accentClass}`}
      >
        {verified ? `See evidence · ${evidence.project.title}` : 'Build it · explain it · prove it'}
      </p>
    </>
  );

  const className = `group block h-full rounded-[24px] border-2 p-3.5 transition-transform duration-200 last:col-span-2 last:mx-auto last:w-[calc(50%-0.375rem)] sm:rounded-[28px] sm:p-5 lg:last:col-span-1 lg:last:mx-0 lg:last:w-auto xl:rounded-[32px] ${
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
