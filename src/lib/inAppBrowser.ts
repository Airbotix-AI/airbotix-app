// In-app browser detection. WeChat's built-in webview (WeChat / 微信) reliably
// breaks the email one-time-code flow: parents open app.airbotix.ai from a link
// shared inside WeChat, request a login/registration code, then can't leave the
// webview to read their inbox — and the webview often suppresses the mail app's
// notification, so the code "never arrives". The fix is to nudge them into the
// system browser BEFORE they get stuck (see WeChatBrowserNotice). Kept as a pure
// function of the user-agent string so it is trivially unit-testable.

/**
 * True when running inside WeChat's in-app browser (its UA carries the
 * `MicroMessenger` token). Also matches WeChat mini-program webviews, which
 * share the same limitation. Defaults to the live UA but accepts an explicit
 * string for testing / SSR safety.
 */
export function isWeChatBrowser(
  userAgent: string | undefined = typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
): boolean {
  if (!userAgent) return false;
  return /micromessenger/i.test(userAgent);
}
