import { describe, expect, it } from 'vitest';

import { parseProject, serializeProject } from '../blocksModel';
import {
  C1_P1_ENVIRONMENT_OPTIONS,
  C1_P1_PREDICTION_OPTIONS,
  C1_P1_PREVIEW_PROJECT,
  C1_P1_REASON_OPTIONS,
  C1_P1_STORY_BEFORE,
  C1_P8_CAUSE_CARD_ORDER,
  C1_P8_CAUSE_CARDS,
  C1_P8_RETELL_OPTIONS,
  C1_P8_STORY_BEFORE,
  JTW_S1_CHAPTERS,
  JTW_S1_PART_IDS,
  jtwPartId,
} from './journeyWestSeason1';

describe('journeyWestSeason1 catalogue', () => {
  it('lists the full 50-part chain in scene-spec order (C1–C5 ×8, C6 ×10)', () => {
    expect(JTW_S1_PART_IDS).toHaveLength(50);
    expect(new Set(JTW_S1_PART_IDS).size).toBe(50);
    expect(JTW_S1_PART_IDS[0]).toBe('jtw-s1-c1-p1');
    expect(JTW_S1_PART_IDS[49]).toBe('jtw-s1-c6-p10');
    expect(JTW_S1_CHAPTERS.map((chapter) => chapter.parts.length)).toEqual([8, 8, 8, 8, 8, 10]);
    expect(jtwPartId('C1-P2')).toBe('jtw-s1-c1-p2');
  });

  it('keeps the C1-P8 chapter-retell contract grounded in the teaching script', () => {
    // The Part 8 story screen ships IN FULL — never compressed to a task hint.
    expect(C1_P8_STORY_BEFORE).toContain(
      'The stone monkey and the group of monkeys slowly walked toward the mountain along the clear spring',
    );
    expect(C1_P8_STORY_BEFORE).toContain(
      'they rearranged what happened just now into five cause and effect cards',
    );
    expect(C1_P8_STORY_BEFORE).toContain(
      'who is willing to see what is behind the water curtain',
    );
    // The five cause-effect cards match the scene-spec node order exactly.
    expect(C1_P8_CAUSE_CARDS.map((card) => card.id)).toEqual(C1_P8_CAUSE_CARD_ORDER);
    expect(C1_P8_CAUSE_CARD_ORDER).toEqual([
      'stone-stir',
      'monkey-appears',
      'partners-see',
      'first-hello',
      'hear-water',
    ]);
    // The correct retell links ≥4 nodes with 因为—所以—结果—后来; the
    // block-name recital is present as a WRONG option (只念积木名不通过).
    const correct = C1_P8_RETELL_OPTIONS.find((option) => option.correct);
    for (const connector of ['Because', 'As a result', 'Later']) {
      expect(correct?.label).toContain(connector);
    }
    const recital = C1_P8_RETELL_OPTIONS.find((option) => option.id === 'block-names-only');
    expect(recital?.correct).toBe(false);
  });

  it('keeps the child-facing story text intact (not compressed into task hints)', () => {
    // The teaching-script story screen ships IN FULL — key sentences from the
    // start, middle and end of both paragraphs must survive verbatim.
    expect(C1_P1_STORY_BEFORE[0]).toContain(
      'Before sunrise, pale blue light spreads across the sea',
    );
    expect(C1_P1_STORY_BEFORE[0]).toContain(
      'a clear spring runs down the mountain',
    );
    expect(C1_P1_STORY_BEFORE[0]).toContain(
      'it has stood through wind, rain, sunshine and moonlight',
    );
    expect(C1_P1_STORY_BEFORE[1]).toContain('Look! There is light inside the crack!');
    expect(C1_P1_STORY_BEFORE[1]).toContain(
      'No one is called Sun Wukong yet, and the pilgrims have not met.',
    );
    expect(C1_P1_STORY_BEFORE.join('').length).toBeGreaterThan(300);
  });

  it('defines the read-only preview as EXACTLY the contracted op chain', () => {
    // Round-trips through the strict project parser (throws on invalid ops).
    expect(parseProject(serializeProject(C1_P1_PREVIEW_PROJECT))).toBeTruthy();
    const ops = C1_P1_PREVIEW_PROJECT.pages[0].characters[0].scripts[0].blocks.map(
      (block) => block.op,
    );
    expect(ops).toEqual(['when_flag', 'hide', 'play_sound', 'wait', 'end']);
    const chime = C1_P1_PREVIEW_PROJECT.pages[0].characters[0].scripts[0].blocks[2];
    expect(chime.n).toBe(2); // 🔔 Chime
  });

  it('grounds the evidence sets in the scene-spec contract', () => {
    expect(C1_P1_ENVIRONMENT_OPTIONS.map((option) => option.id)).toEqual([
      'sea',
      'fruit-trees',
      'spring',
      'immortal-stone',
      'warm-light',
    ]);
    expect(C1_P1_REASON_OPTIONS.filter((option) => option.correct).map((o) => o.id)).toEqual([
      'crack-light',
      'stone-sound',
    ]);
    // The prediction's correct answer is picture-grounded: the monkey has NOT appeared.
    expect(C1_P1_PREDICTION_OPTIONS.find((option) => option.correct)?.id).toBe('not-yet-appeared');
  });
});
