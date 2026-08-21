import { Check, Flag, LockKeyhole, PartyPopper, Presentation, Shapes } from 'lucide-react';

import type { CreatorPassport } from './creatorPassport';

export function CreatorPassportShowcase({ passport }: { passport: CreatorPassport }) {
  const eligibility = passport.showcase_eligibility;
  const ready = eligibility.status === 'eligible';
  const requirements = [
    {
      label: 'Different abilities',
      value: `${Math.min(eligibility.unique_capability_count, 4)}/4`,
      done: eligibility.unique_capability_count >= 4,
      Icon: Shapes,
    },
    {
      label: 'Real projects',
      value: `${Math.min(eligibility.qualifying_project_count, 2)}/2`,
      done: eligibility.qualifying_project_count >= 2,
      Icon: Flag,
    },
    {
      label: 'Workshops',
      value: `${Math.min(eligibility.qualifying_workshop_count, 2)}/2`,
      done: eligibility.qualifying_workshop_count >= 2,
      Icon: PartyPopper,
    },
    {
      label: 'Project Presenter',
      value: eligibility.includes_project_presenter ? 'Ready' : 'To earn',
      done: eligibility.includes_project_presenter,
      Icon: Presentation,
    },
  ];

  return (
    <section
      className={`relative overflow-hidden rounded-[36px] border-2 p-6 sm:p-8 ${
        ready
          ? 'border-brand-sunshine bg-wash-sunshine shadow-brand-sunshine'
          : 'border-brand-bubblegum bg-wash-bubblegum shadow-brand-bubblegum'
      }`}
      aria-labelledby="showcase-heading"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={ready ? 'sticker-sunshine inline-flex' : 'sticker-bubblegum inline-flex'}>
            {ready ? 'Showcase ready' : 'Your Showcase trail'}
          </p>
          <h2 id="showcase-heading" className="mt-4 text-2xl font-extrabold text-ink sm:text-3xl">
            {ready ? 'You unlocked an invitation!' : 'Four steps to Showcase Day'}
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] font-medium leading-6 text-ink-soft">
            {ready
              ? 'You have the evidence for an invitation, not automatic registration. A parent still confirms participation, and public display or media use needs separate permission.'
              : 'Collect different skills across real projects and Workshops. Repeating a skill still shows growth, but breadth unlocks the invitation.'}
          </p>
        </div>
        <div
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${ready ? 'bg-brand-sunshine' : 'bg-canvas-pure'}`}
        >
          {ready ? (
            <PartyPopper size={30} aria-hidden="true" />
          ) : (
            <Flag size={28} aria-hidden="true" />
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {requirements.map(({ label, value, done, Icon }) => (
          <div
            key={label}
            className={`rounded-2xl border-2 px-4 py-4 ${
              done ? 'border-brand-mint bg-wash-mint' : 'border-hairline bg-canvas-pure/80'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <Icon
                size={20}
                className={done ? 'text-brand-mint' : 'text-steel'}
                aria-hidden="true"
              />
              {done ? (
                <Check size={18} className="text-brand-mint" strokeWidth={3} aria-hidden="true" />
              ) : (
                <LockKeyhole size={16} className="text-steel" aria-hidden="true" />
              )}
            </div>
            <p className="mt-3 text-lg font-extrabold text-ink">{value}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate2">{label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
