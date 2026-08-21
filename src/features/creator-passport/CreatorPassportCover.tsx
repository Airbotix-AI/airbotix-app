import { Check, ShieldCheck, Sparkles } from 'lucide-react';

export function CreatorPassportCover({
  nickname,
  verifiedCount,
}: {
  nickname: string;
  verifiedCount: number;
}) {
  return (
    <section className="relative overflow-hidden rounded-[40px] border-2 border-ink bg-ink px-6 py-8 text-canvas shadow-[8px_8px_0_0_#FFD43B] sm:px-10 sm:py-10">
      <div
        className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-brand-sky/30 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-brand-bubblegum/25 blur-2xl"
        aria-hidden="true"
      />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,1.15fr)] lg:items-center">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-brand-sunshine">
            Airbotix · Creator edition
          </p>
          <h1 className="mt-4 text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] text-canvas sm:text-[52px]">
            {nickname}&apos;s
            <span className="block text-brand-mint">Creator Passport</span>
          </h1>
          <p className="mt-4 max-w-xl text-[15px] font-medium leading-6 text-canvas/80 sm:text-[17px]">
            A record of real things you imagined, built, tested and shared.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-[12px] font-bold">
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas/10 px-4 py-2 text-canvas">
              <ShieldCheck size={16} aria-hidden="true" /> Teacher checked
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-canvas/10 px-4 py-2 text-canvas">
              <Sparkles size={16} aria-hidden="true" /> Project powered
            </span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px]">
          <img
            src="/media/creator-passport/creator-passport-hero-v1.webp"
            alt="Open illustrated passport displaying five colourful creator skill stamps"
            width={1200}
            height={800}
            className="h-auto w-full rounded-[28px] object-contain"
            decoding="async"
          />
          <div className="absolute bottom-2 right-2 grid h-24 w-24 place-items-center rounded-full border-2 border-dashed border-ink bg-brand-sunshine text-center text-ink shadow-brand-sunshine sm:bottom-5 sm:right-5 sm:h-28 sm:w-28">
            <div>
              <Check className="mx-auto mb-1" size={22} strokeWidth={3} aria-hidden="true" />
              <div className="text-2xl font-extrabold leading-none sm:text-3xl">
                {verifiedCount}/5
              </div>
              <div className="mt-1 text-[8px] font-extrabold uppercase tracking-[0.12em] sm:text-[9px]">
                stamps earned
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
