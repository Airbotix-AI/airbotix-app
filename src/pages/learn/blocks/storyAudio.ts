import type { StoryMission, StoryPage } from './curriculumGuides';

const STORY_BACKGROUND_KEY = 'bsx-story-background';
let fallbackStoryBackgroundEnabled = false;
let currentStoryAudio: HTMLAudioElement | null = null;

export function canNarrateStory(): boolean {
  if (typeof window === 'undefined') return false;
  const synth = window.speechSynthesis;
  return Boolean(synth && typeof synth.speak === 'function' && typeof synth.cancel === 'function');
}

function clean(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function storyPageNarration(
  mission: StoryMission,
  page: StoryPage,
  isLastPage: boolean,
): string {
  const parts = [
    page.title,
    page.body,
    page.dialogue ? `${page.speaker ?? mission.hero.name} says: ${page.dialogue}` : '',
    isLastPage ? `Your mission: ${mission.mission}` : '',
  ].filter(Boolean);
  return clean(parts.join('. '));
}

export function coachNarration(mission: StoryMission, cueText: string): string {
  return clean(`${mission.hero.name} says: ${cueText}`);
}

export function speakStory(text: string): boolean {
  if (!canNarrateStory()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(clean(text));
  const containsChinese = /[\u3400-\u9fff]/u.test(text);
  utterance.lang = containsChinese ? 'zh-CN' : 'en-AU';
  const matchingVoice = synth
    .getVoices?.()
    .find((voice) => voice.lang.toLowerCase().startsWith(containsChinese ? 'zh' : 'en'));
  if (matchingVoice) utterance.voice = matchingVoice;
  utterance.rate = 0.92;
  utterance.pitch = 1.08;
  utterance.volume = 0.95;
  synth.speak(utterance);
  return true;
}

export function playRecordedStory(audioPath: string, fallbackText: string): boolean {
  stopStorySpeech();
  if (typeof Audio === 'undefined') return speakStory(fallbackText);

  const audio = new Audio(audioPath);
  currentStoryAudio = audio;
  let fallbackStarted = false;
  const startFallback = () => {
    if (currentStoryAudio !== audio || fallbackStarted) return;
    fallbackStarted = true;
    currentStoryAudio = null;
    speakStory(fallbackText);
  };
  audio.addEventListener('error', startFallback, { once: true });
  audio.addEventListener('ended', () => {
    if (currentStoryAudio === audio) currentStoryAudio = null;
  }, { once: true });
  void audio.play().catch(startFallback);
  return true;
}

export function stopStorySpeech(): void {
  if (currentStoryAudio) {
    currentStoryAudio.pause();
    currentStoryAudio.currentTime = 0;
    currentStoryAudio = null;
  }
  if (canNarrateStory()) window.speechSynthesis.cancel();
}

export function isStoryBackgroundEnabled(): boolean {
  try {
    if (typeof localStorage === 'undefined') return fallbackStoryBackgroundEnabled;
    return localStorage.getItem(STORY_BACKGROUND_KEY) === '1';
  } catch {
    return fallbackStoryBackgroundEnabled;
  }
}

export function setStoryBackgroundEnabled(enabled: boolean): void {
  fallbackStoryBackgroundEnabled = enabled;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORY_BACKGROUND_KEY, enabled ? '1' : '0');
  } catch {
    // localStorage can be unavailable in private/test contexts.
  }
}
