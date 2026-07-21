import { describe, expect, it } from 'vitest';

import { isWeChatBrowser } from './inAppBrowser';

const WECHAT_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40(0x18002834) NetType/WIFI Language/zh_CN';
const WECHAT_ANDROID =
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/116.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.42.2420(0x28002A3A) NetType/WIFI';
const SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36';

describe('isWeChatBrowser', () => {
  it('detects the WeChat in-app browser on iOS and Android', () => {
    expect(isWeChatBrowser(WECHAT_IOS)).toBe(true);
    expect(isWeChatBrowser(WECHAT_ANDROID)).toBe(true);
  });

  it('matches the MicroMessenger token case-insensitively', () => {
    expect(isWeChatBrowser('foo micromessenger/8.0 bar')).toBe(true);
  });

  it('returns false for regular mobile and desktop browsers', () => {
    expect(isWeChatBrowser(SAFARI)).toBe(false);
    expect(isWeChatBrowser(CHROME)).toBe(false);
  });

  it('returns false for an empty or undefined user agent', () => {
    expect(isWeChatBrowser('')).toBe(false);
    expect(isWeChatBrowser(undefined)).toBe(false);
  });
});
