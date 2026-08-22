import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

import { isMuted, setMuted, sfx } from '../sounds';
import { playRecordedStory, stopStorySpeech } from '../storyAudio';
import { journeyWestNarrationFor } from './journeyWestNarration';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { JTW_S2_STORY_LINE_ID } from './journeyWestSeason2';
import { fetchStoryLineProgress } from './storyPartsApi';

const ASSET_ROOT = '/story-blocks/journey-to-the-west';
const AUDIO_CONTROL_CLASS = 'min-h-11';

interface ChapterPresentation {
  label: string;
  before: string;
  resolved: string;
  hero: string;
  companion?: string;
  prop?: string;
  soundId: number;
  soundLabel: string;
}

const PRESENTATIONS: Record<number, ChapterPresentation> = {
  4: {
    label: 'Mountain Gate and Training Courtyard',
    before: `${ASSET_ROOT}/backgrounds/s1/c4/before-v01.webp`,
    resolved: `${ASSET_ROOT}/backgrounds/s1/c4/resolved-v01.webp`,
    hero: `${ASSET_ROOT}/characters/wukong-traveller/hands-free-neutral-v01.png`,
    companion: `${ASSET_ROOT}/characters/bodhi-master/neutral-v01.png`,
    prop: `${ASSET_ROOT}/props/name-token/blank-v01.png`,
    soundId: 2,
    soundLabel: 'Mountain gate chime',
  },
  5: {
    label: 'Dragon Palace Pillar Hall',
    before: `${ASSET_ROOT}/backgrounds/s1/c5/before-v01.webp`,
    resolved: `${ASSET_ROOT}/backgrounds/s1/c5/resolved-v01.webp`,
    hero: `${ASSET_ROOT}/characters/wukong-traveller/hands-free-neutral-v01.png`,
    companion: `${ASSET_ROOT}/characters/dragon-king/neutral-v01.png`,
    prop: `${ASSET_ROOT}/props/ruyi-staff/neutral-v01.png`,
    soundId: 6,
    soundLabel: 'Dragon Palace sparkle',
  },
  6: {
    label: 'Heavenly Cloud Road and Five Elements Mountain',
    before: `${ASSET_ROOT}/backgrounds/s1/c6/page1-before-v01.webp`,
    resolved: `${ASSET_ROOT}/backgrounds/s1/c6/page1-resolved-v01.webp`,
    hero: `${ASSET_ROOT}/characters/wukong-traveller/neutral-v01.png`,
    companion: `${ASSET_ROOT}/characters/heaven-duty-official/neutral-v01.png`,
    prop: `${ASSET_ROOT}/props/ruyi-staff/neutral-v01.png`,
    soundId: 4,
    soundLabel: 'Cloud road breeze',
  },
};

function partNumber(partId: string): number {
  return Number(partId.match(/-p(\d+)$/u)?.[1] ?? 0);
}

function chapterNumber(partId: string): number {
  return Number(partId.match(/-c(\d+)-/u)?.[1] ?? 0);
}

function presentationFor(partId: string): ChapterPresentation | null {
  if (partId.startsWith('jtw-s2-')) return null;
  const chapter = chapterNumber(partId);
  const base = PRESENTATIONS[chapter];
  if (!base || chapter !== 6) return base ?? null;

  const part = partNumber(partId);
  const page = part <= 2 ? 1 : part <= 6 ? 2 : 3;
  return {
    ...base,
    before: `${ASSET_ROOT}/backgrounds/s1/c6/page${page}-before-v01.webp`,
    resolved: `${ASSET_ROOT}/backgrounds/s1/c6/page${page}-resolved-v01.webp`,
    companion: page === 1 ? base.companion : undefined,
  };
}

function narrationFrom(root: HTMLDivElement | null): string {
  if (!root) return '';
  const unique = new Set<string>();
  root.querySelectorAll<HTMLElement>('h1, h2, h3, p').forEach((element) => {
    if (element.closest('[aria-hidden="true"]')) return;
    const text = (element.textContent ?? '').replace(/\s+/gu, ' ').trim();
    if (text) unique.add(text);
  });
  return [...unique].join('. ');
}

export function JourneyWestPartExperience({
  partId,
  children,
}: {
  partId: string;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const storyLineId = partId.startsWith('jtw-s2-') ? JTW_S2_STORY_LINE_ID : JTW_S1_STORY_LINE_ID;
  const progress = useQuery({
    queryKey: ['story-parts', storyLineId],
    queryFn: () => fetchStoryLineProgress(storyLineId),
  });
  const [muted, setMuteState] = useState(() => isMuted());
  const [audioStatus, setAudioStatus] = useState<'idle' | 'narrating' | 'cue'>('idle');
  const presentation = useMemo(() => presentationFor(partId), [partId]);
  const resolved = progress.data?.completed.some((entry) => entry.part_id === partId) ?? false;

  useEffect(() => () => stopStorySpeech(), [partId]);

  const narrate = () => {
    const text = narrationFrom(contentRef.current);
    if (!text) return;
    const recordedNarration = journeyWestNarrationFor(partId);
    const started = recordedNarration
      ? playRecordedStory(recordedNarration.audioPath, recordedNarration.text)
      : false;
    setAudioStatus(started ? 'narrating' : 'idle');
  };

  const playCue = () => {
    if (!presentation) return;
    sfx.playSound(presentation.soundId);
    setAudioStatus('cue');
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setMuteState(next);
    if (next) {
      stopStorySpeech();
      setAudioStatus('idle');
    }
  };

  return (
    <>
      <aside
        className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center gap-2 px-4"
        aria-label="Story sound control"
        data-testid="jtw-audio-controls"
      >
        <button
          className={`btn-pill-secondary ${AUDIO_CONTROL_CLASS}`}
          type="button"
          onClick={narrate}
          disabled={muted}
        >
          {audioStatus === 'narrating' ? 'Reading aloud · Listen again' : '🔊 Read this Part aloud'}
        </button>
        {presentation && (
          <button
            className={`btn-pill-secondary ${AUDIO_CONTROL_CLASS}`}
            type="button"
            onClick={playCue}
            disabled={muted}
          >
            {audioStatus === 'cue'
              ? `✓ ${presentation.soundLabel}`
              : `♪ ${presentation.soundLabel}`}
          </button>
        )}
        <button
          className={`btn-pill-ghost ${AUDIO_CONTROL_CLASS}`}
          type="button"
          onClick={toggleMute}
          aria-pressed={muted}
        >
          {muted ? 'Turn sound on' : 'Mute'}
        </button>
        <span className="text-xs text-ink-soft">
          Every clue and result stays visible when sound is off.
        </span>
      </aside>

      {presentation && (
        <section
          className="relative mx-4 mt-4 aspect-[16/9] max-w-3xl overflow-hidden rounded-3xl border border-hairline bg-canvas-pure shadow-card-soft sm:mx-auto"
          data-testid="jtw-chapter-stage"
          data-chapter={chapterNumber(partId)}
          data-state={resolved ? 'resolved' : 'before'}
          aria-label={`${presentation.label}, ${resolved ? 'task complete' : 'task ready'}`}
        >
          <img
            src={resolved ? presentation.resolved : presentation.before}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {presentation.companion && (
            <img
              src={presentation.companion}
              alt="story companion"
              className="absolute bottom-[5%] left-[7%] h-[42%] max-w-[30%] object-contain object-bottom drop-shadow-lg"
            />
          )}
          <img
            src={presentation.hero}
            alt="Sun Wukong"
            className="absolute bottom-[4%] left-[38%] h-[53%] max-w-[30%] object-contain object-bottom drop-shadow-xl"
          />
          {presentation.prop && (
            <img
              src={presentation.prop}
              alt={chapterNumber(partId) === 5 ? 'Golden-Hooped Staff' : 'Chapter story prop'}
              className="absolute bottom-[8%] right-[9%] h-[31%] max-w-[24%] object-contain object-bottom drop-shadow-lg"
            />
          )}
          <div className="absolute left-4 top-4 rounded-full bg-canvas-pure/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
            Chapter {chapterNumber(partId)} · Part {partNumber(partId)} · {presentation.label}
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-canvas-pure/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
            {resolved ? '✓ Story change saved' : 'Look closely, then start the task'}
          </div>
        </section>
      )}

      <div ref={contentRef}>{children}</div>
    </>
  );
}
