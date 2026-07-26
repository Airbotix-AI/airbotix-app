import { Check, Copy, MoreHorizontal, TriangleAlert } from 'lucide-react';
import { useState } from 'react';

import { isWeChatBrowser } from '@/lib/inAppBrowser';

interface WeChatBrowserNoticeProps {
  // Allow the caller (or tests) to force detection instead of reading the live
  // UA — defaults to real WeChat detection so callers just drop it in.
  inWeChat?: boolean;
}

/**
 * Warns parents who opened the app inside WeChat's in-app browser that the email
 * one-time code often won't reach them there, and points them to "open in the
 * system browser". Renders nothing outside WeChat, so it is safe to place on any
 * auth screen unconditionally. Bilingual because the affected audience is
 * predominantly Chinese-speaking WeChat users.
 */
export function WeChatBrowserNotice({ inWeChat = isWeChatBrowser() }: WeChatBrowserNoticeProps) {
  const [copied, setCopied] = useState(false);

  if (!inWeChat) return null;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard can be blocked inside the webview — the manual "···" path
      // below still works, so fail quietly rather than surfacing an error.
    }
  };

  return (
    <div
      role="alert"
      data-testid="wechat-browser-notice"
      className="mb-6 rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine px-4 py-4 text-ink"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-brand-sunshine" aria-hidden="true">
          <TriangleAlert size={20} strokeWidth={2.4} />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="text-[14px] font-bold leading-snug">
            微信内可能收不到验证码
            <span className="block text-[12px] font-semibold text-ink-soft">
              You may not receive the code inside WeChat
            </span>
          </p>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            请点右上角 <span className="font-semibold text-ink">···</span> →{' '}
            <span className="font-semibold text-ink">在浏览器中打开</span>，用系统浏览器（Safari /
            Chrome）继续登录或注册。
            <span className="mt-1 block">
              Tap <span className="inline-flex items-center align-middle"><MoreHorizontal size={14} /></span> in
              the top-right corner → <span className="font-semibold text-ink">Open in Browser</span>,
              then sign in there.
            </span>
          </p>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-sunshine/60 bg-canvas-pure px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-wash-sunshine"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '链接已复制 Link copied' : '复制网址 Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
