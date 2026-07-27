import { describe, expect, it, vi } from 'vitest';

import type { BlocksProject, Character, Script } from './blocksModel';
import { PAGE_FLOW_MAX_VISITS, PageFlowRunner, runPageFlow } from './pageFlowRun';

const noSleep = () => Promise.resolve();

function walker(start: { gx: number; gy: number }, scripts: Script[]): Character {
  return {
    id: 'walker',
    name: 'Walker',
    emoji: '🐵',
    start: { gx: start.gx, gy: start.gy, size: 1, rot: 0 },
    scripts,
  };
}

/** A three-page project whose exits the individual tests set. */
function project(exits: readonly (number | null)[]): BlocksProject {
  return {
    version: 1,
    name: 'page flow fixture',
    pages: exits.map((exit, index) => ({
      id: `page-${index + 1}`,
      background: 'plain',
      characters: [
        walker({ gx: index + 1, gy: 5 }, [
          {
            id: `script-${index + 1}`,
            blocks: [
              { op: 'when_flag' },
              { op: 'move_right', n: 2 },
              exit === null ? { op: 'end' } : { op: 'goto_page', n: exit },
            ],
          },
        ]),
      ],
    })),
  };
}

describe('pageFlowRun · finite-step page traces', () => {
  it('follows the exit numbers page by page and stops at a stable End', async () => {
    const result = await runPageFlow(project([2, 3, null]), { sleep: noSleep });

    expect(result.trace).toEqual([1, 2, 3]);
    expect(result.stoppedBy).toBe('end');
    expect(result.firstLoopPage).toBeNull();
    expect(result.visits.map((visit) => visit.exitTo)).toEqual([2, 3, null]);
    // Each page entry resets the sprites, so every page walks from its own start.
    expect(result.visits.map((visit) => visit.enterCell)).toEqual(['1-5', '2-5', '3-5']);
    expect(result.visits.map((visit) => visit.exitCell)).toEqual(['3-5', '4-5', '5-5']);
    expect(result.visits.every((visit) => visit.ran)).toBe(true);
  });

  it('stops the moment the route re-enters a page, recording 1 → 2 → 1', async () => {
    // The C3-P2 shape: Page 1 exits to 2, Page 2 exits back to 1.
    const result = await runPageFlow(project([2, 1, null]), { sleep: noSleep });

    expect(result.trace).toEqual([1, 2, 1]);
    expect(result.stoppedBy).toBe('loop');
    expect(result.firstLoopPage).toBe(2);
    // The re-entry is recorded but NOT run again — no endless page flicker.
    const revisit = result.visits[2];
    expect(revisit.ran).toBe(false);
    expect(revisit.enterCell).toBe('1-5'); // the page's own start pose
    expect(revisit.exitCell).toBeNull();
    expect(revisit.exitTo).toBeNull();
  });

  it('bounds a longer cycle with the teaching visit budget', async () => {
    const result = await runPageFlow(project([2, 3, 1]), { sleep: noSleep, maxVisits: 2 });

    expect(result.trace).toEqual([1, 2]);
    expect(result.stoppedBy).toBe('budget');
    expect(PAGE_FLOW_MAX_VISITS).toBe(6);
  });

  it('reports an exit that points at a page the project does not have', async () => {
    const result = await runPageFlow(project([9, null, null]), { sleep: noSleep });

    expect(result.trace).toEqual([1]);
    expect(result.stoppedBy).toBe('missing_page');
  });

  it('starts from the requested page and tracks the named character', async () => {
    const three = project([2, 3, null]);
    three.pages[2].characters.push({
      id: 'friend',
      name: 'Friend',
      emoji: '🐵',
      start: { gx: 10, gy: 2, size: 1, rot: 0 },
      scripts: [],
    });

    const result = await runPageFlow(three, {
      sleep: noSleep,
      startPage: 3,
      trackCharacterId: 'friend',
    });

    expect(result.trace).toEqual([3]);
    expect(result.visits[0].enterCell).toBe('10-2');
    expect(result.visits[0].exitCell).toBe('10-2'); // the friend has no script
  });

  it('passes stage callbacks through and announces each page entry', async () => {
    const onPageEnter = vi.fn();
    const onSprite = vi.fn();
    const onSound = vi.fn();
    const sounding = project([2, null, null]);
    sounding.pages[0].characters[0].scripts[0].blocks.splice(1, 0, { op: 'play_sound', n: 4 });

    await runPageFlow(sounding, { sleep: noSleep, onPageEnter, host: { onSprite, onSound } });

    expect(onPageEnter.mock.calls).toEqual([
      [1, 'page-1'],
      [2, 'page-2'],
    ]);
    expect(onSound).toHaveBeenCalledWith(4);
    expect(onSprite).toHaveBeenCalled();
  });

  it('refuses a project with no pages instead of returning a fake empty run', () => {
    expect(() => new PageFlowRunner({ version: 1, name: 'empty', pages: [] })).toThrow(
      /no pages/,
    );
  });

  it('stops an in-flight run when the caller unmounts', async () => {
    const runner = new PageFlowRunner(project([2, 3, null]), { sleep: noSleep });
    const running = runner.run();
    runner.stop();
    const result = await running;

    expect(result.stoppedBy).toBe('stopped');
    expect(result.trace.length).toBeLessThan(3);
  });
});
