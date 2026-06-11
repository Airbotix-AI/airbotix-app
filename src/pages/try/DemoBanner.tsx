// The fixed demo-mode strip shown above both `/try/*` studios (try-demo-mode-prd
// §2 D-DEMO-08): concise demo-mode notice + the marketing site's contact page.

const CONTACT_URL = 'https://airbotix.ai/contact';

export function DemoBanner() {
  return (
    <div
      data-testid="demo-banner"
      className="flex h-10 shrink-0 items-center justify-center gap-2 bg-brand-coral px-4 text-[13px] font-bold text-white"
    >
      <span aria-hidden>🎈</span>
      <span>Demo mode</span>
      <a
        href={CONTACT_URL}
        target="_blank"
        rel="noreferrer"
        className="font-extrabold underline underline-offset-2"
      >
        Questions? Contact us →
      </a>
    </div>
  );
}
