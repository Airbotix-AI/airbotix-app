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

  it('addPage caps at 4 pages and selects the new page', () => {
    store().addPage();
    store().addPage();
    store().addPage();
    expect(store().project.pages).toHaveLength(4);
    expect(store().pageId).toBe(store().project.pages[3].id);
    store().addPage(); // capped
    expect(store().project.pages).toHaveLength(4);
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
});
