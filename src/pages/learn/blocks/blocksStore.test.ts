import { beforeEach, describe, expect, it } from 'vitest';

import { blankProject } from './blocksModel';
import { useBlocksStore } from './blocksStore';

const store = () => useBlocksStore.getState();
const char = () => {
  const s = store();
  const page = s.project.pages.find((p) => p.id === s.pageId)!;
  return page.characters.find((c) => c.id === s.charId)!;
};

describe('blocksStore', () => {
  beforeEach(() => {
    store().load(blankProject('Test'));
  });

  it('a trigger starts a new script; other blocks extend the last script', () => {
    store().addBlock('when_flag');
    store().addBlock('move_right');
    store().addBlock('hop');
    expect(char().scripts).toHaveLength(1);
    expect(char().scripts[0].blocks.map((b) => b.op)).toEqual(['when_flag', 'move_right', 'hop']);

    store().addBlock('when_tap'); // a second script
    store().addBlock('pop');
    expect(char().scripts).toHaveLength(2);
    expect(char().scripts[1].blocks.map((b) => b.op)).toEqual(['when_tap', 'pop']);
  });

  it('a lone non-trigger auto-opens a 🚩 script (the block always runs)', () => {
    store().addBlock('move_up');
    expect(char().scripts[0].blocks.map((b) => b.op)).toEqual(['when_flag', 'move_up']);
  });

  it('removing the trigger removes the whole script; mid-blocks splice out', () => {
    store().addBlock('when_flag');
    store().addBlock('move_right');
    store().addBlock('pop');
    const id = char().scripts[0].id;
    store().removeBlock(id, 1);
    expect(char().scripts[0].blocks.map((b) => b.op)).toEqual(['when_flag', 'pop']);
    store().removeBlock(id, 0); // pluck the trigger
    expect(char().scripts).toHaveLength(0);
  });

  it('cycleParam wraps 1…9→1 and bumps dirty', () => {
    store().addBlock('when_flag');
    store().addBlock('wait'); // defaultN 5
    const id = char().scripts[0].id;
    const before = store().dirty;
    store().cycleParam(id, 1);
    expect(char().scripts[0].blocks[1].n).toBe(6);
    for (let i = 0; i < 3; i += 1) store().cycleParam(id, 1);
    expect(char().scripts[0].blocks[1].n).toBe(9);
    store().cycleParam(id, 1);
    expect(char().scripts[0].blocks[1].n).toBe(1); // wrapped
    expect(store().dirty).toBeGreaterThan(before);
  });

  it('addPage adds pages freely (no 4-page cap) and selects the new one', () => {
    for (let i = 0; i < 8; i += 1) store().addPage();
    expect(store().project.pages).toHaveLength(9); // 1 initial + 8
    expect(store().pageId).toBe(store().project.pages[8].id);
  });

  it('addCharacter selects the new friend; removeCharacter keeps at least one', () => {
    store().addCharacter('⚽', 'Ball');
    const page = store().project.pages[0];
    expect(page.characters).toHaveLength(2);
    expect(store().charId).toBe(page.characters[1].id);

    store().removeCharacter(page.characters[1].id);
    expect(store().project.pages[0].characters).toHaveLength(1);
    store().removeCharacter(store().project.pages[0].characters[0].id); // refused
    expect(store().project.pages[0].characters).toHaveLength(1);
  });

  it('moveCharacter clamps the start pose to the grid', () => {
    const id = char().id;
    store().moveCharacter(id, 99, -4);
    expect(char().start).toMatchObject({ gx: 19, gy: 0 });
  });

  it('setParam sets an exact value, clamped to 1..9', () => {
    store().addBlock('when_flag');
    store().addBlock('wait');
    const id = char().scripts[0].id;
    store().setParam(id, 1, 7);
    expect(char().scripts[0].blocks[1].n).toBe(7);
    store().setParam(id, 1, 99);
    expect(char().scripts[0].blocks[1].n).toBe(9); // clamped high
    store().setParam(id, 1, 0);
    expect(char().scripts[0].blocks[1].n).toBe(1); // clamped low
  });

  it('moveBlock reorders body blocks but keeps the trigger first', () => {
    store().addBlock('when_flag');
    store().addBlock('move_right'); // index 1
    store().addBlock('say'); // index 2
    store().addBlock('hop'); // index 3
    const id = char().scripts[0].id;
    const ops = () => char().scripts[0].blocks.map((b) => b.op);

    store().moveBlock(id, 3, 1); // hop → right after the trigger
    expect(ops()).toEqual(['when_flag', 'hop', 'move_right', 'say']);

    store().moveBlock(id, 1, 0); // refuse to move anything before the trigger
    expect(ops()[0]).toBe('when_flag');
  });

  it('insertBlock drops a body block at an exact slot (clamped to 1..len)', () => {
    store().addBlock('when_flag');
    store().addBlock('move_right'); // index 1
    store().addBlock('hop'); // index 2
    const id = char().scripts[0].id;
    const ops = () => char().scripts[0].blocks.map((b) => b.op);

    store().insertBlock('say', id, 1); // squeeze between trigger and move_right
    expect(ops()).toEqual(['when_flag', 'say', 'move_right', 'hop']);

    store().insertBlock('pop', id, 99); // clamp past the end → append
    expect(ops()).toEqual(['when_flag', 'say', 'move_right', 'hop', 'pop']);

    store().insertBlock('wait', id, 0); // clamp before the trigger → slot 1
    expect(ops()[0]).toBe('when_flag');
    expect(ops()[1]).toBe('wait');
  });

  it('insertBlock with a trigger op starts a fresh script (never mid-chain)', () => {
    store().addBlock('when_flag');
    store().addBlock('move_right');
    const id = char().scripts[0].id;
    store().insertBlock('when_tap', id, 1); // a trigger can't go mid-script
    expect(char().scripts).toHaveLength(2);
    expect(char().scripts[0].blocks.map((b) => b.op)).toEqual(['when_flag', 'move_right']);
    expect(char().scripts[1].blocks.map((b) => b.op)).toEqual(['when_tap']);
  });

  it('moveBlockAcross moves a body block into a different track at a slot', () => {
    store().addBlock('when_flag'); // track A
    store().addBlock('move_right');
    store().addBlock('hop');
    store().addBlock('when_tap'); // track B (new trigger)
    store().addBlock('pop');
    const a = char().scripts[0].id;
    const b = char().scripts[1].id;
    const ops = (sid: string) => char().scripts.find((s) => s.id === sid)!.blocks.map((x) => x.op);

    // move 'move_right' (track A index 1) into track B at slot 1 (after its trigger)
    store().moveBlockAcross(a, 1, b, 1);
    expect(ops(a)).toEqual(['when_flag', 'hop']);
    expect(ops(b)).toEqual(['when_tap', 'move_right', 'pop']);

    // a trigger never moves across tracks
    store().moveBlockAcross(b, 0, a, 1);
    expect(ops(b)[0]).toBe('when_tap');
  });

  it('moveBlockAcross within the same track reorders (delegates correctly)', () => {
    store().addBlock('when_flag');
    store().addBlock('move_right'); // 1
    store().addBlock('hop'); // 2
    const id = char().scripts[0].id;
    store().moveBlockAcross(id, 2, id, 1); // hop before move_right
    expect(char().scripts[0].blocks.map((b) => b.op)).toEqual(['when_flag', 'hop', 'move_right']);
  });

  it('removePage keeps at least one page and reselects when the open page goes', () => {
    store().addPage(); // now 2 pages, page 2 selected
    const firstPage = store().project.pages[0].id;
    const secondPage = store().project.pages[1].id;
    expect(store().pageId).toBe(secondPage);

    store().removePage(secondPage); // remove the open page
    expect(store().project.pages).toHaveLength(1);
    expect(store().pageId).toBe(firstPage); // reselected

    store().removePage(firstPage); // refuse to drop the last page
    expect(store().project.pages).toHaveLength(1);
  });

  it('undo / redo step through edits and restore the project', () => {
    store().addBlock('when_flag');
    store().addBlock('move_right');
    store().addBlock('hop');
    const ops = () => char().scripts[0]?.blocks.map((b) => b.op) ?? [];
    expect(ops()).toEqual(['when_flag', 'move_right', 'hop']);
    expect(store().past.length).toBe(3);

    store().undo(); // removes hop
    expect(ops()).toEqual(['when_flag', 'move_right']);
    store().undo(); // removes move_right
    expect(ops()).toEqual(['when_flag']);
    expect(store().future.length).toBe(2);

    store().redo(); // move_right back
    expect(ops()).toEqual(['when_flag', 'move_right']);

    // a new edit after undo clears the redo stack
    store().addBlock('pop');
    expect(store().future.length).toBe(0);
    expect(ops()).toEqual(['when_flag', 'move_right', 'pop']);
  });

  it('coalesces a stepper / drag session into ONE undo step', () => {
    store().addBlock('when_flag');
    store().addBlock('wait'); // defaultN 5
    const id = char().scripts[0].id;
    const baseline = store().past.length;
    // a stepper session: several setParam in a row → ONE history entry
    store().setParam(id, 1, 6);
    store().setParam(id, 1, 7);
    store().setParam(id, 1, 8);
    expect(store().past.length).toBe(baseline + 1);
    store().undo();
    expect(char().scripts[0].blocks[1].n).toBe(5); // back to before the session
    // ending the session means the next set is its own step
    store().endCoalesce();
    store().setParam(id, 1, 2);
    store().endCoalesce();
    store().setParam(id, 1, 3);
    expect(store().past.length).toBe(baseline + 2);
  });

  it('load resets history; setHistory restores a persisted stack', () => {
    store().addBlock('when_flag');
    expect(store().past.length).toBe(1);
    store().load(blankProject('Fresh'));
    expect(store().past).toHaveLength(0);
    expect(store().future).toHaveLength(0);

    const entry = { project: blankProject('X'), pageId: 'p', charId: 'c' };
    store().setHistory([entry], []);
    expect(store().past).toHaveLength(1);
  });
});
