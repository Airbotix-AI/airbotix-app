// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { FadeScroller } from './FadeScroller';

// jsdom has no layout: give the scroller a fake scrollable geometry.
function mockGeometry(
  el: HTMLElement,
  { scrollWidth = 0, clientWidth = 0, scrollHeight = 0, clientHeight = 0 },
) {
  Object.defineProperties(el, {
    scrollWidth: { value: scrollWidth, configurable: true },
    clientWidth: { value: clientWidth, configurable: true },
    scrollHeight: { value: scrollHeight, configurable: true },
    clientHeight: { value: clientHeight, configurable: true },
  });
}

function setup(geometry: Parameters<typeof mockGeometry>[1]) {
  const r = render(
    <FadeScroller className="probe">
      <span>content</span>
    </FadeScroller>,
  );
  const scroller = r.container.querySelector('.bsx-fscroll') as HTMLElement;
  const thumbX = r.container.querySelector('.bsx-thumb-x') as HTMLElement;
  mockGeometry(scroller, geometry);
  return { scroller, thumbX };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('FadeScroller', () => {
  it('fades only towards hidden content — nothing faded at the resting start', () => {
    const { scroller } = setup({ scrollWidth: 600, clientWidth: 200 });
    act(() => scroller.dispatchEvent(new Event('scroll')));
    // at scrollLeft 0: no fade at the start, fade at the end
    expect(scroller.style.getPropertyValue('--fl')).toBe('0px');
    expect(scroller.style.getPropertyValue('--fr')).toBe('16px');

    scroller.scrollLeft = 300; // mid-scroll: both ends fade
    act(() => scroller.dispatchEvent(new Event('scroll')));
    expect(scroller.style.getPropertyValue('--fl')).toBe('16px');
    expect(scroller.style.getPropertyValue('--fr')).toBe('16px');

    scroller.scrollLeft = 400; // at the end: end fade gone — fully visible
    act(() => scroller.dispatchEvent(new Event('scroll')));
    expect(scroller.style.getPropertyValue('--fl')).toBe('16px');
    expect(scroller.style.getPropertyValue('--fr')).toBe('0px');
  });

  it('never fades when the content fits', () => {
    const { scroller } = setup({ scrollWidth: 200, clientWidth: 200, scrollHeight: 100, clientHeight: 100 });
    act(() => scroller.dispatchEvent(new Event('scroll')));
    for (const v of ['--fl', '--fr', '--ft', '--fb']) {
      expect(scroller.style.getPropertyValue(v)).toBe('0px');
    }
  });

  it('shows the thumb while scrolling and hides it again when idle', () => {
    vi.useFakeTimers();
    const { scroller, thumbX } = setup({ scrollWidth: 600, clientWidth: 200 });
    expect(thumbX.classList.contains('on')).toBe(false); // no flash on mount
    act(() => scroller.dispatchEvent(new Event('scroll')));
    expect(thumbX.classList.contains('on')).toBe(true);
    act(() => vi.advanceTimersByTime(700));
    expect(thumbX.classList.contains('on')).toBe(false);
  });
});
