// Dev-LAN convenience: when the backend URL is configured for localhost but the
// app was opened from a *different* host — e.g. a phone/tablet on the LAN at
// http://192.168.x.x:4321 — rewrite the URL to that same host, so requests reach
// the dev machine instead of the device's own (empty) localhost.
//
// No-op for real localhost (dev machine) and for production (api.airbotix.ai is
// not a localhost URL, so it's never rewritten).

export function sameHostInDev(configuredUrl: string): string {
  if (typeof window === 'undefined') return configuredUrl;
  try {
    const url = new URL(configuredUrl);
    const page = window.location.hostname;
    const localApi = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const pageOnLan = page !== 'localhost' && page !== '127.0.0.1';
    if (localApi && pageOnLan) {
      url.hostname = page;
      // strip the trailing slash URL() adds for an origin-only URL; keep any path
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // malformed URL — fall back to the configured value
  }
  return configuredUrl;
}
