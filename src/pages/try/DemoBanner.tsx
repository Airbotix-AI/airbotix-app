// The fixed demo-mode strip shown above both `/try/*` studios (try-demo-mode-prd
// §2 D-DEMO-08): the honest "nothing is saved" notice + the book-a-chat CTA.

const BOOK_URL = 'https://airbotix.ai/book';

export function DemoBanner() {
  return (
    <div
      data-testid="demo-banner"
      className="flex h-10 shrink-0 items-center justify-center gap-2 bg-brand-coral px-4 text-[13px] font-bold text-white"
    >
      <span aria-hidden>🎈</span>
      <span>Demo mode — nothing is saved, every visit starts fresh.</span>
      <a
        href={BOOK_URL}
        target="_blank"
        rel="noreferrer"
        className="font-extrabold underline underline-offset-2"
      >
        Liked it? Book a chat →
      </a>
    </div>
  );
}
