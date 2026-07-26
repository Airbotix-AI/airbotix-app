import { describe, expect, it } from 'vitest';

import {
  evaluateMusicMission,
  missionChecksMet,
  missionSeed,
  missionTemplateGrid,
  parseMusicMission,
  unionRiffGrids,
  type MusicMission,
} from './musicMission';
import {
  emptyRiff,
  riffNoteCount,
  riffToSeedScore,
  toggleRiffCell,
  type SeedScore,
} from './riffPad';

const DRUM_TEMPLATE_RIFF: SeedScore = {
  tempo: 100,
  key: 'C major',
  tracks: [
    {
      instrument: 'drums',
      role: 'percussion',
      notes: [
        { time: 0, note: 'kick', duration: '8n' },
        { time: 1, note: 'snare', duration: '8n' },
      ],
    },
  ],
};

function mission(overrides: Partial<MusicMission> = {}): MusicMission {
  return {
    id: 'mission_1',
    title: 'Write a melody over the groove',
    template: { mode: 'base', riff: DRUM_TEMPLATE_RIFF },
    accept: { min_melody_notes: 2 },
    ...overrides,
  };
}

describe('parseMusicMission (router-state boundary)', () => {
  it('accepts the PackLessonsPage payload and drops junk templates', () => {
    const parsed = parseMusicMission({
      id: 'm1',
      title: 'T',
      description: 'D',
      template: { mode: 'base', riff: DRUM_TEMPLATE_RIFF },
      checklist: ['listen first', 42],
      accept: { min_melody_notes: 3 },
    });
    expect(parsed).toMatchObject({ id: 'm1', title: 'T', description: 'D' });
    expect(parsed?.template?.mode).toBe('base');
    expect(parsed?.checklist).toEqual(['listen first']);
    expect(parsed?.accept?.min_melody_notes).toBe(3);
    // Junk shapes never crash the studio.
    expect(parseMusicMission(null)).toBeNull();
    expect(parseMusicMission({ title: 'no id' })).toBeNull();
    expect(parseMusicMission({ id: 'm', title: 'T', template: { riff: 'junk' } })?.template).toBeUndefined();
  });
});

describe('evaluateMusicMission (deterministic checks, kid notes only)', () => {
  it('walks each rule from unmet to met as the kid taps', () => {
    const accept = {
      min_melody_notes: 2,
      min_distinct_pitches: 2,
      needs_drums: true,
      needs_offbeat: true,
    };
    let g = emptyRiff();
    expect(missionChecksMet(evaluateMusicMission(accept, g))).toBe(false);
    g = toggleRiffCell(g, 'melody', 7, 0); // C4 on-beat
    g = toggleRiffCell(g, 'melody', 5, 1); // E4 OFF-beat (odd step)
    g = toggleRiffCell(g, 'drums', 2, 0); // kick
    const items = evaluateMusicMission(accept, g);
    expect(items).toHaveLength(4);
    expect(items.every((i) => i.ok)).toBe(true);
    expect(items[0].label).toContain('2/2');
  });

  it('labels say what to ADD — never a grade', () => {
    for (const item of evaluateMusicMission(
      { min_melody_notes: 1, needs_drums: true, needs_offbeat: true, min_distinct_pitches: 2 },
      emptyRiff(),
    )) {
      expect(item.label).not.toMatch(/good|bad|score|grade/i);
    }
  });

  it('returns [] with no accept rules', () => {
    expect(evaluateMusicMission(undefined, emptyRiff())).toEqual([]);
  });
});

describe('template layers and the compose seed (§5A D-MS14)', () => {
  it('missionTemplateGrid maps the template riff onto the pad', () => {
    const grid = missionTemplateGrid(mission());
    expect(grid?.drums[2][0]).toBe(true); // kick @ step 0
    expect(grid?.drums[1][2]).toBe(true); // snare @ beat 1 = step 2
  });

  it('a base template rides the compose seed WITH the kid notes', () => {
    let g = emptyRiff();
    g = toggleRiffCell(g, 'melody', 7, 0);
    const seed = missionSeed(g, mission());
    const instruments = seed?.tracks.map((t) => t.instrument);
    expect(instruments).toEqual(['guitar', 'drums']);
    expect(seed?.tracks[1].notes.map((n) => n.note)).toEqual(['kick', 'snare']);
  });

  it('a reference template stays OUT of the seed — the kid line is the subject', () => {
    let g = emptyRiff();
    g = toggleRiffCell(g, 'melody', 7, 0);
    const seed = missionSeed(
      g,
      mission({ template: { mode: 'reference', riff: DRUM_TEMPLATE_RIFF } }),
    );
    expect(seed?.tracks.map((t) => t.instrument)).toEqual(['guitar']);
  });

  it('unionRiffGrids merges without mutating either side', () => {
    let kid = emptyRiff();
    kid = toggleRiffCell(kid, 'melody', 0, 0);
    const tpl = missionTemplateGrid(mission())!;
    const merged = unionRiffGrids(kid, tpl);
    expect(riffNoteCount(merged)).toBe(1 + riffNoteCount(tpl));
    expect(riffNoteCount(kid)).toBe(1);
    expect(unionRiffGrids(kid, null)).toBe(kid);
  });

  it('an empty pad with only a base template still seeds nothing for the kid gate', () => {
    // riffToSeedScore (the generate gate) sees the KID grid only…
    expect(riffToSeedScore(emptyRiff())).toBeNull();
    // …while missionSeed would carry the template — the gate is what keeps a
    // kid from turning in course content untouched.
    expect(missionSeed(emptyRiff(), mission())?.tracks[0].instrument).toBe('drums');
  });
});
