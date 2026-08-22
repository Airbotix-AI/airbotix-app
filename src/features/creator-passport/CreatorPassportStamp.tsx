import { ArrowRight, Check, LockKeyhole, Sparkles } from 'lucide-react';

import type { CreatorCapabilityCode, PassportEvidence } from './creatorPassport';
import type { PassportStampChapter } from './creatorPassportStampBook';
import { CreatorPassportStampArt } from './CreatorPassportStampArt';
import { CAPABILITY_VISUALS } from './creatorPassportVisuals';

export function CreatorPassportStamp({
  code,
  chapter,
  evidence,
  nextQuest,
}: {
  code: CreatorCapabilityCode;
  chapter: PassportStampChapter;
  evidence: PassportEvidence | undefined;
  nextQuest: boolean;
}) {
  const visual = CAPABILITY_VISUALS[code];
  const verified = !!evidence;

  const content = (
    <>
      <div className="relative grid place-items-center">
        <span
          className={`absolute left-0 top-0 grid h-5 w-5 place-items-center rounded-full text-[9px] font-black ${
            verified ? visual.statusClass : 'bg-surface text-slate2'
          }`}
          aria-label={`Chapter ${chapter.level}`}
        >
          {chapter.level}
        </span>
        <div className={`h-16 w-16 sm:h-20 sm:w-20 ${visual.tiltClass}`}>
          <CreatorPassportStampArt code={code} earned={verified} level={chapter.level} />
        </div>
      </div>

      <h3 className="mt-1 min-h-8 text-center text-[12px] font-extrabold leading-4 text-ink sm:text-[13px]">
        {chapter.label}
      </h3>

      <div className="mt-2 border-t border-hairline pt-2 text-center">
        <p
          className={`inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.08em] ${
            verified ? visual.accentClass : nextQuest ? 'text-ink' : 'text-slate2'
          }`}
        >
          {verified ? (
            <Check size={11} strokeWidth={3} aria-hidden="true" />
          ) : nextQuest ? (
            <Sparkles size={10} aria-hidden="true" />
          ) : (
            <LockKeyhole size={10} aria-hidden="true" />
          )}
          {verified ? 'Collected' : nextQuest ? 'Try next' : 'Locked'}
        </p>
        <p className="mt-1 line-clamp-2 min-h-8 text-[9px] font-bold leading-4 text-ink-soft sm:text-[10px]">
          {verified ? (
            <>
              {evidence.project.title}{' '}
              <ArrowRight className="inline" size={11} aria-hidden="true" />
            </>
          ) : (
            chapter.quest
          )}
        </p>
      </div>
    </>
  );

  const className = `group block h-full rounded-[20px] border bg-canvas-pure p-2.5 transition duration-200 sm:p-3 ${
    verified
      ? 'border-hairline hover:-translate-y-0.5 hover:border-stone2 hover:shadow-card-soft focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand-sky'
      : nextQuest
        ? 'border-dashed border-brand-sunshine bg-wash-sunshine/40'
        : 'border-dashed border-hairline opacity-50'
  }`;

  return verified ? (
    <a
      href={`#passport-evidence-${evidence.id}`}
      className={className}
      aria-label={`${chapter.label} collected. See evidence from ${evidence.project.title}.`}
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
