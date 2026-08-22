import { Check, ShieldCheck, Sparkles } from 'lucide-react';

export function CreatorPassportCover({
  nickname,
  verifiedCapabilityCount,
  collectedStampCount,
}: {
  nickname: string;
  verifiedCapabilityCount: number;
  collectedStampCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border-2 border-ink bg-ink px-5 py-6 text-canvas shadow-[6px_6px_0_0_#FFD43B] sm:px-8 sm:py-8 lg:rounded-[40px] lg:px-10 lg:py-10 lg:shadow-[8px_8px_0_0_#FFD43B]">
      <div
        className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-sky/30 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-brand-bubblegum/25 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative grid gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(420px,1.18fr)] lg:items-center lg:gap-8">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-sunshine">
            Airbotix · Creator edition
          </p>
          <h1 className="mt-3 text-[34px] font-extrabold leading-[1.02] tracking-[-0.035em] text-canvas sm:text-[46px] lg:text-[52px]">
            {nickname}&apos;s
            <span className="block text-brand-mint">Creator Passport</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] font-medium leading-6 text-canvas/75 sm:text-[16px]">
            A record of real things you imagined, built, tested and shared.
          </p>
          <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-canvas/60">
                Passport progress
              </span>
              <span className="text-sm font-extrabold text-brand-sunshine">
                {collectedStampCount} of 15 collected
              </span>
            </div>
            <div
              className="mt-3 grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1"
              aria-hidden="true"
            >
              {Array.from({ length: 15 }, (_, index) => (
                <span
                  key={index}
                  className={`h-2 rounded-full ${index < collectedStampCount ? 'bg-brand-sunshine' : 'bg-white/15'}`}
                />
              ))}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold sm:text-[12px]">
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas/10 px-4 py-2 text-canvas">
              <ShieldCheck size={16} aria-hidden="true" /> Teacher checked
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas/10 px-4 py-2 text-canvas">
              <Sparkles size={16} aria-hidden="true" /> Project powered
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[560px] lg:max-w-[620px]">
          <img
            src="/media/creator-passport/creator-passport-hero-v2.webp"
            alt="Open illustrated passport displaying fifteen colourful creator stamps across three levels"
            width={1536}
            height={1024}
            className="h-auto w-full rounded-[22px] object-contain lg:rounded-[28px]"
            decoding="async"
          />
          <div className="absolute bottom-2 right-2 grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-ink bg-brand-sunshine text-center text-ink shadow-brand-sunshine sm:bottom-5 sm:right-5 sm:h-24 sm:w-24 lg:h-28 lg:w-28">
            <div>
              <Check className="mx-auto mb-1" size={22} strokeWidth={3} aria-hidden="true" />
              <div className="text-xl font-extrabold leading-none sm:text-2xl lg:text-3xl">
                {collectedStampCount}/15
              </div>
              <div className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.12em] sm:text-[9px]">
                stamps collected
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] font-bold text-canvas/55">
            {verifiedCapabilityCount}/5 skill trails started
          </p>
        </div>
      </div>
    </section>
  );
}
