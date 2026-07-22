// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { storyMissionFor } from './curriculumGuides';
import {
  coachNarration,
  isStoryBackgroundEnabled,
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
    });
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
