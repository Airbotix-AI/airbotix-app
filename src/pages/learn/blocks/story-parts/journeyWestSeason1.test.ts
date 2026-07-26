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
    expect(C1_P8_STORY_BEFORE).toContain('石猴和群猴沿着清泉慢慢往山里走');
    expect(C1_P8_STORY_BEFORE).toContain('把刚才发生的事重新排成五张因果卡');
    expect(C1_P8_STORY_BEFORE).toContain('是谁愿意看清水帘后面究竟有什么');
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
    for (const connector of ['因为', '所以', '结果', '后来']) {
      expect(correct?.label).toContain(connector);
    }
    const recital = C1_P8_RETELL_OPTIONS.find((option) => option.id === 'block-names-only');
    expect(recital?.correct).toBe(false);
  });

  it('keeps the child-facing story text intact (not compressed into task hints)', () => {
    // The teaching-script story screen ships IN FULL — key sentences from the
    // start, middle and end of both paragraphs must survive verbatim.
    expect(C1_P1_STORY_BEFORE[0]).toContain('天还没有完全亮，大海先把一层淡蓝色的光推到岸边');
    expect(C1_P1_STORY_BEFORE[0]).toContain('清泉从高处一路唱到谷底');
    expect(C1_P1_STORY_BEFORE[0]).toContain('却一直迎着风、雨、日光和月色');
    expect(C1_P1_STORY_BEFORE[1]).toContain('你们看，石缝里有光！');
    expect(C1_P1_STORY_BEFORE[1]).toContain('这里还没有谁叫孙悟空，也没有取经队伍');
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
    expect(C1_P1_PREDICTION_OPTIONS.find((option) => option.correct)?.id).toBe(
      'not-yet-appeared',
    );
  });
});
