import { ArrowRight, Check, LockKeyhole } from 'lucide-react';

import type { CreatorCapabilityCode, PassportEvidence } from './creatorPassport';
import { CAPABILITY_COPY } from './creatorPassport';
import { CreatorPassportStampArt } from './CreatorPassportStampArt';
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

  const content = (
    <>
      <div className="grid place-items-center">
        <div className={`h-20 w-20 sm:h-24 sm:w-24 xl:h-28 xl:w-28 ${visual.tiltClass}`}>
          <CreatorPassportStampArt code={code} earned={verified} />
        </div>
      </div>

      <h3 className="mt-2 text-center text-[15px] font-extrabold leading-tight text-ink sm:text-base xl:text-lg">
        {copy.label}
      </h3>
      <p className="mt-1 line-clamp-2 text-center text-[10px] font-medium leading-4 text-ink-soft sm:text-[11px]">
        {copy.description}
      </p>

      <div className="mt-3 border-t border-hairline pt-2.5 text-center">
        <p
          className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.08em] ${
            verified ? visual.accentClass : 'text-slate2'
          }`}
        >
          {verified ? (
            <Check size={11} strokeWidth={3} aria-hidden="true" />
          ) : (
            <LockKeyhole size={10} aria-hidden="true" />
          )}
          {verified ? 'Earned' : 'Next quest'}
        </p>
        <p className="mt-1 line-clamp-1 text-[10px] font-bold text-ink sm:text-[11px]">
          {verified ? (
            <>
              {evidence.project.title}{' '}
              <ArrowRight className="inline" size={11} aria-hidden="true" />
            </>
          ) : (
            'Build · explain · prove'
          )}
        </p>
      </div>
    </>
  );

  const className = `group block h-full rounded-[22px] border bg-canvas-pure p-3 transition duration-200 last:col-span-2 last:mx-auto last:w-[calc(50%-0.375rem)] sm:p-4 lg:last:col-span-1 lg:last:mx-0 lg:last:w-auto ${
    verified
      ? 'border-hairline hover:-translate-y-0.5 hover:border-stone2 hover:shadow-card-soft focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand-sky'
      : 'border-dashed border-stone2 opacity-65'
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
