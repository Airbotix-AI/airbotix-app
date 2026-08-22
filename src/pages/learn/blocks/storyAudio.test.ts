// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyMissionFor } from './curriculumGuides';
import {
  coachNarration,
  isStoryBackgroundEnabled,
  playRecordedStory,
  setStoryBackgroundEnabled,
  speakStory,
  storyPageNarration,
} from './storyAudio';

const mission = storyMissionFor('tsv-s1-a1-h')!;

afterEach(() => {
  vi.unstubAllGlobals();
  setStoryBackgroundEnabled(false);
});

function stubSpeech() {
  const speak = vi.fn();
  const cancel = vi.fn();
  class FakeSpeechSynthesisUtterance {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    volume = 1;

    constructor(text: string) {
      this.text = text;
    }
  }
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: { speak, cancel },
  });
  vi.stubGlobal('SpeechSynthesisUtterance', FakeSpeechSynthesisUtterance);
  return { speak, cancel };
}

describe('storyAudio', () => {
  it('builds a compact narration script for the current story page', () => {
    const page = mission.storyPages[0];
    const narration = storyPageNarration(mission, page, false);

    expect(narration).toContain(page.title);
    expect(narration).toContain(page.body);
    expect(narration).toContain(page.dialogue);
    expect(narration).not.toContain('Your mission:');
  });

  it('adds the mission sentence only on the last story page', () => {
    const lastPage = mission.storyPages.at(-1)!;
    const narration = storyPageNarration(mission, lastPage, true);

    expect(narration).toContain(`Your mission: ${mission.mission}`);
  });

  it('speaks with a calm child-facing pace using on-device speech synthesis', () => {
    const speech = stubSpeech();

    expect(speakStory('  Lumi   says hello.  ')).toBe(true);

    expect(speech.cancel).toHaveBeenCalledOnce();
    expect(speech.speak).toHaveBeenCalledOnce();
    expect(speech.speak.mock.calls[0][0]).toMatchObject({
      text: 'Lumi says hello.',
      rate: 0.92,
      pitch: 1.08,
      volume: 0.95,
      lang: 'en-AU',
    });
  });

  it('selects Chinese on-device narration for Story Blocks Chinese copy', () => {
    const speech = stubSpeech();

    expect(speakStory('悟空先观察，再运行程序。')).toBe(true);

    expect(speech.speak.mock.calls[0][0]).toMatchObject({ lang: 'zh-CN' });
  });

  it('plays a recorded story and stops it before replaying', () => {
    const speech = stubSpeech();
    const pause = vi.fn();
    const play = vi.fn().mockResolvedValue(undefined);
    const addEventListener = vi.fn();
    const audio = { addEventListener, currentTime: 8, pause, play };
    const AudioConstructor = vi.fn(() => audio);
    vi.stubGlobal('Audio', AudioConstructor);

    expect(playRecordedStory('/story.mp3', 'fallback')).toBe(true);

    expect(AudioConstructor).toHaveBeenCalledWith('/story.mp3');
    expect(play).toHaveBeenCalledOnce();
    expect(speech.speak).not.toHaveBeenCalled();
  });

  it('falls back to device speech when a recording cannot play', async () => {
    const speech = stubSpeech();
    const audio = {
      addEventListener: vi.fn(),
      currentTime: 0,
      pause: vi.fn(),
      play: vi.fn().mockRejectedValue(new Error('missing recording')),
    };
    vi.stubGlobal('Audio', vi.fn(() => audio));

    expect(playRecordedStory('/missing.mp3', '悟空继续前进。')).toBe(true);
    await Promise.resolve();

    expect(speech.speak).toHaveBeenCalledOnce();
  });

  it('stores the child-facing background music preference locally', () => {
    expect(isStoryBackgroundEnabled()).toBe(false);

    setStoryBackgroundEnabled(true);
    expect(isStoryBackgroundEnabled()).toBe(true);

    setStoryBackgroundEnabled(false);
    expect(isStoryBackgroundEnabled()).toBe(false);
  });

  it('turns coach copy into a character-spoken line', () => {
    expect(coachNarration(mission, 'Press Go and watch two things.')).toBe(
      'Lumilo says: Press Go and watch two things.',
    );
  });
});
