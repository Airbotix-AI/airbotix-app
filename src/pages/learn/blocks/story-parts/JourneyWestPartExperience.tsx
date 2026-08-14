import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import { isMuted, setMuted, sfx } from '../sounds'
import { speakStory, stopStorySpeech } from '../storyAudio'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { fetchStoryLineProgress } from './storyPartsApi'

const ASSET_ROOT = '/story-blocks/journey-to-the-west'

interface ChapterPresentation {
  label: string
  before: string
  resolved: string
  hero: string
  companion?: string
  prop?: string
  soundId: number
  soundLabel: string
}

const PRESENTATIONS: Record<number, ChapterPresentation> = {
  4: {
    label: '山门与学艺庭院',
    before: `${ASSET_ROOT}/backgrounds/s1/c4/before-v01.webp`,
    resolved: `${ASSET_ROOT}/backgrounds/s1/c4/resolved-v01.webp`,
    hero: `${ASSET_ROOT}/characters/wukong-traveller/hands-free-neutral-v01.png`,
    companion: `${ASSET_ROOT}/characters/bodhi-master/neutral-v01.png`,
    prop: `${ASSET_ROOT}/props/name-token/blank-v01.png`,
    soundId: 2,
    soundLabel: '山门清铃',
  },
  5: {
    label: '东海龙宫柱厅',
    before: `${ASSET_ROOT}/backgrounds/s1/c5/before-v01.webp`,
    resolved: `${ASSET_ROOT}/backgrounds/s1/c5/resolved-v01.webp`,
    hero: `${ASSET_ROOT}/characters/wukong-traveller/hands-free-neutral-v01.png`,
    companion: `${ASSET_ROOT}/characters/dragon-king/neutral-v01.png`,
    prop: `${ASSET_ROOT}/props/ruyi-staff/neutral-v01.png`,
    soundId: 6,
    soundLabel: '龙宫微光',
  },
  6: {
    label: '天宫云路与五行山',
    before: `${ASSET_ROOT}/backgrounds/s1/c6/page1-before-v01.webp`,
    resolved: `${ASSET_ROOT}/backgrounds/s1/c6/page1-resolved-v01.webp`,
    hero: `${ASSET_ROOT}/characters/wukong-traveller/neutral-v01.png`,
    companion: `${ASSET_ROOT}/characters/heaven-duty-official/neutral-v01.png`,
    prop: `${ASSET_ROOT}/props/ruyi-staff/neutral-v01.png`,
    soundId: 4,
    soundLabel: '云路轻风',
  },
}

function partNumber(partId: string): number {
  return Number(partId.match(/-p(\d+)$/u)?.[1] ?? 0)
}

function chapterNumber(partId: string): number {
  return Number(partId.match(/-c(\d+)-/u)?.[1] ?? 0)
}

function presentationFor(partId: string): ChapterPresentation | null {
  const chapter = chapterNumber(partId)
  const base = PRESENTATIONS[chapter]
  if (!base || chapter !== 6) return base ?? null

  const part = partNumber(partId)
  const page = part <= 2 ? 1 : part <= 6 ? 2 : 3
  return {
    ...base,
    before: `${ASSET_ROOT}/backgrounds/s1/c6/page${page}-before-v01.webp`,
    resolved: `${ASSET_ROOT}/backgrounds/s1/c6/page${page}-resolved-v01.webp`,
    companion: page === 1 ? base.companion : undefined,
  }
}

function narrationFrom(root: HTMLDivElement | null): string {
  if (!root) return ''
  const unique = new Set<string>()
  root.querySelectorAll<HTMLElement>('h1, h2, h3, p').forEach((element) => {
    if (element.closest('[aria-hidden="true"]')) return
    const text = (element.textContent ?? '').replace(/\s+/gu, ' ').trim()
    if (text) unique.add(text)
  })
  return [...unique].join('。')
}

export function JourneyWestPartExperience({ partId, children }: { partId: string; children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null)
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  })
  const [muted, setMuteState] = useState(() => isMuted())
  const [audioStatus, setAudioStatus] = useState<'idle' | 'narrating' | 'cue'>('idle')
  const presentation = useMemo(() => presentationFor(partId), [partId])
  const resolved = progress.data?.completed.some((entry) => entry.part_id === partId) ?? false

  useEffect(() => () => stopStorySpeech(), [partId])

  const narrate = () => {
    const text = narrationFrom(contentRef.current)
    if (!text) return
    setAudioStatus(speakStory(text) ? 'narrating' : 'idle')
  }

  const playCue = () => {
    if (!presentation) return
    sfx.playSound(presentation.soundId)
    setAudioStatus('cue')
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setMuteState(next)
    if (next) {
      stopStorySpeech()
      setAudioStatus('idle')
    }
  }

  return (
    <>
      <aside
        className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center gap-2 px-4"
        aria-label="故事声音控制"
        data-testid="jtw-audio-controls"
      >
        <button className="btn-pill-secondary" type="button" onClick={narrate} disabled={muted}>
          {audioStatus === 'narrating' ? '正在朗读 · 再听一次' : '🔊 朗读这一 Part'}
        </button>
        {presentation && (
          <button className="btn-pill-secondary" type="button" onClick={playCue} disabled={muted}>
            {audioStatus === 'cue' ? `✓ ${presentation.soundLabel}` : `♪ ${presentation.soundLabel}`}
          </button>
        )}
        <button className="btn-pill-ghost" type="button" onClick={toggleMute} aria-pressed={muted}>
          {muted ? '开启声音' : '静音'}
        </button>
        <span className="text-xs text-ink-soft">声音关闭时，所有成功与任务证据仍会显示在画面上。</span>
      </aside>

      {presentation && (
        <section
          className="relative mx-4 mt-4 aspect-[16/9] max-w-3xl overflow-hidden rounded-3xl border border-hairline bg-canvas-pure shadow-card-soft sm:mx-auto"
          data-testid="jtw-chapter-stage"
          data-chapter={chapterNumber(partId)}
          data-state={resolved ? 'resolved' : 'before'}
          aria-label={`${presentation.label}，${resolved ? '任务完成状态' : '任务开始状态'}`}
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
              alt="故事伙伴"
              className="absolute bottom-[5%] left-[7%] h-[42%] max-w-[30%] object-contain object-bottom drop-shadow-lg"
            />
          )}
          <img
            src={presentation.hero}
            alt="孙悟空"
            className="absolute bottom-[4%] left-[38%] h-[53%] max-w-[30%] object-contain object-bottom drop-shadow-xl"
          />
          {presentation.prop && (
            <img
              src={presentation.prop}
              alt={chapterNumber(partId) === 5 ? '如意金箍棒' : '本章故事道具'}
              className="absolute bottom-[8%] right-[9%] h-[31%] max-w-[24%] object-contain object-bottom drop-shadow-lg"
            />
          )}
          <div className="absolute left-4 top-4 rounded-full bg-canvas-pure/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
            第 {chapterNumber(partId)} 章 · Part {partNumber(partId)} · {presentation.label}
          </div>
          <div className="absolute bottom-3 right-3 rounded-full bg-canvas-pure/90 px-3 py-1 text-xs font-bold text-ink shadow-sm">
            {resolved ? '✓ 世界变化已保存' : '观察画面，再开始任务'}
          </div>
        </section>
      )}

      <div ref={contentRef}>{children}</div>
    </>
  )
}
