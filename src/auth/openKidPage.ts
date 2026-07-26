import type { KidLoginResponse } from './types';

const LEARN_PATH = '/learn';

/**
 * Open a kid's Learn surface in a NEW browser tab while the parent stays signed
 * in on the current tab.
 *
 * Parent + kid sessions coexist in one browser: each has its own in-memory
 * access token AND its own HttpOnly refresh cookie (see `authStore` +
 * `useBootstrap`; `useParentKidLogin` writes only the dedicated kid cookie). So a
 * second tab can hold the kid session without evicting the parent one.
 *
 * We open the tab SYNCHRONOUSLY inside the click gesture so the browser does not
 * popup-block it, THEN run the parent→kid login (which sets the kid refresh
 * cookie), THEN point the new tab at `/learn` — where `useBootstrap` restores the
 * kid session from that cookie. If the browser still blocks the popup (or
 * `window.open` is unavailable), we fall back to the previous same-tab navigation
 * so the action never silently no-ops.
 */
export async function openKidPageInNewTab(
  parentKidLogin: (kidId: string) => Promise<KidLoginResponse>,
  kidId: string,
  navigateSameTab: (to: string) => void,
): Promise<void> {
  // Must NOT pass `noopener` — that makes window.open return null and we lose the
  // handle we need to navigate the tab after the login resolves.
  const kidTab = typeof window !== 'undefined' ? window.open('', '_blank') : null;
  try {
    await parentKidLogin(kidId);
  } catch (err) {
    kidTab?.close();
    throw err;
  }
  if (kidTab && !kidTab.closed) {
    kidTab.location.href = `${window.location.origin}${LEARN_PATH}`;
  } else {
    navigateSameTab(LEARN_PATH);
  }
}
