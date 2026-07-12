// @vitest-environment jsdom
//
// Screenshot evidence capture (D-HARN-21b, frontend half). The load-bearing
// contract: the attached screenshot is ALWAYS wire-legal (data:image/(png|jpeg|
// webp), ≤200k chars, 16–1024 px) and EVERY failure path resolves undefined/null
// — a screenshot bug must never fail a kid's run (the report posts without it).
// The DOM raster path (Image decode + canvas) can't run under jsdom (no codec /
// no 2D context), which is exactly the degrade path we pin here; the happy path
// is covered end-to-end by the useVerification loop tests (injected capture) +
// the harness journey.
import { describe, expect, it } from 'vitest';

import {
  SCREENSHOT_MAX_EDGE,
  captureReportScreenshot,
  isWireLegalScreenshot,
  requestFrameSnapshot,
  screenshotDims,
  toReportScreenshot,
} from './reportScreenshot';
import { MAX_SCREENSHOT_DATAURL_CHARS } from './runReport';

describe('screenshotDims (pure downscale math)', () => {
  it('scales the longest edge down to the cap, preserving aspect', () => {
    expect(screenshotDims(1920, 1080)).toEqual({ width: 480, height: 270 });
    expect(screenshotDims(1080, 1920)).toEqual({ width: 270, height: 480 });
  });

  it('never upscales a small snapshot', () => {
    expect(screenshotDims(320, 240)).toEqual({ width: 320, height: 240 });
    expect(SCREENSHOT_MAX_EDGE).toBe(480);
  });

  it('rejects degenerate and out-of-range results (wire floor is 16px)', () => {
    expect(screenshotDims(0, 100)).toBeNull();
    expect(screenshotDims(-5, 100)).toBeNull();
    expect(screenshotDims(NaN, 100)).toBeNull();
    // 8000×100 → 480×6: the short edge lands under the 16px wire floor.
    expect(screenshotDims(8000, 100)).toBeNull();
  });
});

describe('isWireLegalScreenshot (frozen contract guard)', () => {
  const good = { dataUrl: 'data:image/jpeg;base64,AAAA', width: 480, height: 270 };

  it('accepts the three legal encodings within caps', () => {
    for (const mime of ['png', 'jpeg', 'webp']) {
      expect(isWireLegalScreenshot({ ...good, dataUrl: `data:image/${mime};base64,AAAA` })).toBe(true);
    }
  });

  it('rejects illegal mime, oversize payloads, and out-of-range dims', () => {
    expect(isWireLegalScreenshot({ ...good, dataUrl: 'data:image/gif;base64,AAAA' })).toBe(false);
    expect(isWireLegalScreenshot({ ...good, dataUrl: 'data:image/svg+xml;base64,AAAA' })).toBe(false);
    expect(
      isWireLegalScreenshot({
        ...good,
        dataUrl: `data:image/jpeg;base64,${'A'.repeat(MAX_SCREENSHOT_DATAURL_CHARS)}`,
      }),
    ).toBe(false);
    expect(isWireLegalScreenshot({ ...good, width: 8 })).toBe(false);
    expect(isWireLegalScreenshot({ ...good, height: 2048 })).toBe(false);
    expect(isWireLegalScreenshot({ ...good, width: 480.5 })).toBe(false);
  });
});

describe('failure paths resolve empty — never throw, never hang', () => {
  it('toReportScreenshot → null on an undecodable dataUrl (jsdom has no codec)', async () => {
    // jsdom's Image fires NEITHER load nor error — the decode timeout is the
    // never-hang guard this pins. 20ms keeps the test fast (prod: 1500ms).
    await expect(toReportScreenshot('data:image/png;base64,not-an-image', 20)).resolves.toBeNull();
  });

  it('captureReportScreenshot → undefined when no game frame is mounted', async () => {
    await expect(captureReportScreenshot()).resolves.toBeUndefined();
  });

  it('requestFrameSnapshot resolves null when the frame never answers (timeout)', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    // A silent frame: nothing ever posts back. A 20ms bound keeps the test fast;
    // production uses SCREENSHOT_TIMEOUT_MS (1500ms).
    await expect(requestFrameSnapshot(iframe, 20)).resolves.toBeNull();
    iframe.remove();
  });

  it('requestFrameSnapshot resolves the snapshot reply dataUrl (composited or raw)', async () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const pending = requestFrameSnapshot(iframe, 500);
    // The sandboxed frame replies over postMessage; simulate both-additive shape.
    window.postMessage({ __airbotixSnapshot: true, dataUrl: 'data:image/png;base64,RAW', composited: true }, '*');
    await expect(pending).resolves.toBe('data:image/png;base64,RAW');
    iframe.remove();
  });
});
