import { useSearchParams } from 'react-router-dom';

/**
 * Friendly "you came from kids-opencode" banner on /portal/wallet and
 * /portal/wallet/topup. Activated when the URL carries `?from=cli`
 * (the deep-link the TUI's [w] shortcut opens). Shows the truncated
 * device id so a parent can verify which install asked them to top up
 * if they have multiple.
 *
 * The banner is informational only — it doesn't change which packs are
 * shown or how billing works. The CLI continues to poll wallet balance
 * on its own; when the parent finishes top-up they just hit [Enter] in
 * the TUI.
 */
export function CliReturnBanner() {
  const [params] = useSearchParams();
  if (params.get('from') !== 'cli') return null;

  const lang = params.get('lang');
  const isZh = lang === 'zh-Hans';
  const device = params.get('device') || '';
  const deviceShort = device.length > 8 ? device.slice(0, 8) : device;

  return (
    <div className="rounded-2xl bg-wash-mint border border-brand-mint/40 px-5 py-4 mb-6 flex items-start gap-3">
      <span className="sticker-mint shrink-0">{isZh ? '来自终端' : 'From the CLI'}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-ink">
          {isZh
            ? '你从 kids-opencode 命令行过来的'
            : 'You opened this from kids-opencode'}
        </div>
        <div className="text-[13px] text-ink-soft mt-1">
          {isZh
            ? '充值完成后，回到终端窗口按 [Enter] 就能接着用。这一页不需要复制任何东西回去。'
            : 'Top up here, then switch back to your terminal and press [Enter] to keep going. Nothing to copy from this page.'}
        </div>
        {deviceShort && (
          <div className="text-[11px] uppercase tracking-[0.10em] text-slate2 font-bold mt-2">
            {isZh ? '设备' : 'Device'} · {deviceShort}…
          </div>
        )}
      </div>
    </div>
  );
}
