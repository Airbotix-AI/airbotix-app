import { describe, expect, it } from 'vitest';

import type { MixSnapshot } from './offlineRender';
import {
  buildRealSongPrompt,
  MIX_PROMINENT_MIN,
  MIX_QUIET_MAX,
  realSongSeconds,
} from './realSongApi';
import type { MusicScore } from './scoreTypes';

// "Make it real" (music-stage-prd §2 step ⑥) hands the audio provider a prompt
// DERIVED from the score the kid already composed — the retired Music Maker asked
// them to describe the song a second time, which is how you end up with an MP3
// that sounds nothing like the one on the stage.

const score = (over: Partial<MusicScore> = {}): MusicScore => ({
  title: 'Star Puppy Jam',
  tempo: 120,
  key: 'C major',
  genre: 'rock',
  tracks: [
    { instrument: 'drums', role: 'percussion', notes: [{ time: 0, note: 'kick', duration: '4n' }] },
    { instrument: 'bass', role: 'rhythm', notes: [{ time: 0, note: 'C2', duration: '4n' }] },
  ],
  ...over,
});

describe('buildRealSongPrompt', () => {
  it('describes the song the kid actually wrote', () => {
    expect(buildRealSongPrompt(score())).toBe(
      'Star Puppy Jam, rock style, 120 BPM, key of C major, featuring drums, bass',
    );
  });

  it('leads with the kid’s own words when they typed a topic', () => {
    expect(buildRealSongPrompt(score(), 'a song about my dog')).toMatch(/^a song about my dog, rock style/);
  });

  it('falls back to the title when the topic is blank', () => {
    expect(buildRealSongPrompt(score(), '   ')).toMatch(/^Star Puppy Jam,/);
  });

  it('never emits "undefined style" — genre is optional on a score', () => {
    const out = buildRealSongPrompt(score({ genre: undefined }));
    expect(out).not.toContain('undefined');
    expect(out).toBe('Star Puppy Jam, 120 BPM, key of C major, featuring drums, bass');
  });

  it('lists each instrument once, however many tracks use it', () => {
    const s = score({
      tracks: [
        { instrument: 'drums', role: 'percussion', notes: [{ time: 0, note: 'kick', duration: '4n' }] },
        { instrument: 'drums', role: 'percussion', notes: [{ time: 1, note: 'snare', duration: '4n' }] },
      ],
    });
    expect(buildRealSongPrompt(s)).toContain('featuring drums');
    expect(buildRealSongPrompt(s)).not.toContain('drums, drums');
  });

  // Track-editing PRD §3-B ("调 VOL 合成一模一样" owner feedback 2026-07-17):
  // the stage mix is part of the arrangement — the provider must hear it.
  describe('with the stage mix (§3-B)', () => {
    const mix = (over: Partial<MixSnapshot> = {}): MixSnapshot => ({
      muted: {},
      solo: null,
      silenced: new Set<string>(),
      volumes: {},
      ...over,
    });

    it('drops muted instruments from the featuring list (AC-4)', () => {
      const out = buildRealSongPrompt(score(), undefined, mix({ muted: { drums: true } }));
      expect(out).toContain('featuring bass');
      expect(out).not.toContain('drums');
    });

    it('drops style=None (silenced) instruments (AC-5)', () => {
      const out = buildRealSongPrompt(score(), undefined, mix({ silenced: new Set(['bass']) }));
      expect(out).toContain('featuring drums');
      expect(out).not.toContain('bass');
    });

    it('a solo becomes "featuring mainly the …"', () => {
      const out = buildRealSongPrompt(score(), undefined, mix({ solo: 'bass' }));
      expect(out).toContain('featuring mainly the bass');
      expect(out).not.toContain('drums');
    });

    it('volume extremes read as quiet / prominent wording (AC-4)', () => {
      const out = buildRealSongPrompt(
        score(),
        undefined,
        mix({ volumes: { drums: MIX_QUIET_MAX, bass: MIX_PROMINENT_MIN } }),
      );
      expect(out).toContain('quiet drums');
      expect(out).toContain('prominent bass');
    });

    it('the default slider volume stays plain — no accidental "prominent" band', () => {
      const out = buildRealSongPrompt(score(), undefined, mix({ volumes: { drums: 0.85 } }));
      expect(out).toContain('featuring drums, bass');
    });

    it('everything muted → no featuring clause at all, never an empty one', () => {
      const out = buildRealSongPrompt(
        score(),
        undefined,
        mix({ muted: { drums: true, bass: true } }),
      );
      expect(out).not.toContain('featuring');
      expect(out.endsWith('key of C major')).toBe(true);
    });

    it('without a mix the legacy full-instrument prompt is unchanged', () => {
      expect(buildRealSongPrompt(score())).toBe(
        'Star Puppy Jam, rock style, 120 BPM, key of C major, featuring drums, bass',
      );
    });
  });
});

describe('realSongSeconds', () => {
  it('measures the LAST note’s beat, not the note count', () => {
    // 8 beats at 120 BPM = 4s. Density must not change the answer: a track with
    // one note on beat 7 and a track with 32 notes ending on beat 7 are both 4s.
    const sparse = score({
      tracks: [{ instrument: 'bass', role: 'rhythm', notes: [{ time: 7, note: 'C2', duration: '4n' }] }],
    });
    const dense = score({
      tracks: [
        {
          instrument: 'bass',
          role: 'rhythm',
          notes: Array.from({ length: 32 }, (_, i) => ({
            time: i * 0.225,
            note: 'C2',
            duration: '16n',
          })),
        },
      ],
    });
    expect(realSongSeconds(sparse)).toBe(4);
    expect(realSongSeconds(dense)).toBe(4);
  });

  it('never returns 0 seconds for a song with a single note on beat 0', () => {
    const s = score({
      tracks: [{ instrument: 'piano', role: 'lead', notes: [{ time: 0, note: 'C4', duration: '4n' }] }],
    });
    expect(realSongSeconds(s)).toBeGreaterThanOrEqual(1);
  });

  it('caps an absurdly long score instead of asking for a 10-minute render', () => {
    const s = score({
      tracks: [{ instrument: 'pad', role: 'harmony', notes: [{ time: 100_000, note: 'C4', duration: '1n' }] }],
    });
    expect(realSongSeconds(s)).toBe(120);
  });
});
