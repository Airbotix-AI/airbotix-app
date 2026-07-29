// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import {
  dropSlotInZone,
  isNoopDrop,
  scanDropZones,
  zoneHoldsDrop,
} from './blockDropZones';

/** jsdom has no layout, so every element under test declares its own rect. */
function rect(el: HTMLElement, left: number, top: number, width: number, height: number) {
  el.getBoundingClientRect = () =>
    ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;
}

/**
 * A track laid out like the real editor:
 *   [ trigger ][ move ][ If ─ body:[ hop ] ][ say ]
 * The If's body is a nested drop zone sitting inside the track's zone, which is
 * the whole point of the scan: the deepest zone under the pointer wins.
 */
function buildTrack() {
  const root = document.createElement('div');
  document.body.appendChild(root);

  const track = document.createElement('div');
  track.setAttribute('data-drop-zone', 's1');
  track.setAttribute('data-zone-path', '');
  rect(track, 0, 0, 600, 120);
  root.appendChild(track);

  const addItem = (parent: HTMLElement, path: string, left: number, width: number) => {
    const el = document.createElement('div');
    el.setAttribute('data-block-path', path);
    rect(el, left, 10, width, 48);
    parent.appendChild(el);
    return el;
  };

  addItem(track, '0', 0, 80); // trigger
  addItem(track, '1', 80, 80); // move
  const ifBlock = addItem(track, '2', 160, 240); // the C-block wrapper
  addItem(track, '3', 400, 80); // say

  const body = document.createElement('div');
  body.setAttribute('data-drop-zone', 's1');
  body.setAttribute('data-zone-path', '2');
  rect(body, 180, 60, 200, 46);
  ifBlock.appendChild(body);
  addItem(body, '2.0', 180, 80); // hop, inside the If

  return { root, track, body };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('scanDropZones', () => {
  it('lands inside the If body when the pointer is over it', () => {
    buildTrack();
    // x=200 is left of the hop's midpoint (180 + 40), so it drops before it.
    expect(scanDropZones(200, 80)).toEqual({ scriptId: 's1', path: [2, 0] });
    // past the hop's midpoint → append inside the body
    expect(scanDropZones(300, 80)).toEqual({ scriptId: 's1', path: [2, 1] });
  });

  it('lands in the track when the pointer is over the track, not the body', () => {
    buildTrack();
    // over the "move" block's left half → slot 1, in front of it
    expect(scanDropZones(90, 30)).toEqual({ scriptId: 's1', path: [1] });
    // past every block → append at the end of the track
    expect(scanDropZones(560, 30)).toEqual({ scriptId: 's1', path: [4] });
  });

  it('never lets a slot land in front of the trigger', () => {
    buildTrack();
    expect(scanDropZones(2, 30)?.path).toEqual([1]);
  });

  it('refuses to drop a C-block inside its own body', () => {
    buildTrack();
    // Dragging the If itself: the body zone is inside it, so the scan must fall
    // back to the track rather than nesting the block into itself.
    const hit = scanDropZones(200, 80, { scriptId: 's1', path: [2] });
    expect(hit?.path.length).toBe(1);
  });

  it('returns null when the pointer is nowhere near a zone', () => {
    buildTrack();
    expect(scanDropZones(900, 900)).toBeNull();
  });
});

describe('dropSlotInZone / zoneHoldsDrop', () => {
  const target = { scriptId: 's1', path: [2, 1] };

  it('reports the slot only for the zone that owns it', () => {
    expect(dropSlotInZone(target, 's1', [2])).toBe(1);
    expect(dropSlotInZone(target, 's1', [])).toBeNull(); // it belongs to the body
    expect(dropSlotInZone(target, 's2', [2])).toBeNull();
    expect(dropSlotInZone(null, 's1', [2])).toBeNull();
  });

  it('lights up every zone the drop sits inside', () => {
    expect(zoneHoldsDrop(target, 's1', [])).toBe(true); // the whole track glows
    expect(zoneHoldsDrop(target, 's1', [2])).toBe(true); // and so does the If body
    expect(zoneHoldsDrop(target, 's1', [3])).toBe(false);
    expect(zoneHoldsDrop(target, 's2', [])).toBe(false);
  });
});

describe('isNoopDrop', () => {
  it('treats the block’s own slot and the gap just after it as no moves', () => {
    expect(isNoopDrop([2], [2])).toBe(true);
    expect(isNoopDrop([2], [3])).toBe(true);
    expect(isNoopDrop([2], [4])).toBe(false);
    expect(isNoopDrop([2], [1])).toBe(false);
  });

  it('is never a no-op across different parents', () => {
    expect(isNoopDrop([2], [2, 0])).toBe(false);
    expect(isNoopDrop([2, 0], [3, 0])).toBe(false);
  });
});
