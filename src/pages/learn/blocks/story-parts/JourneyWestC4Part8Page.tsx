import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import { useMe } from '@/auth/useAuth'
import type { BlockOp } from '../blocksModel'
import { BlocksRunner } from '../interpreter'
import { JTW_C4_WUKONG_ID } from '../jtwC4DualBuild'
import { findC4PersonalShipBuild } from './journeyWestC4PersonalShip'
import {
  C4_P8_CAUSE_CARDS,
  C4_P8_CLASSIC_CARD,
  C4_P8_DEBUG_EVIDENCE,
  C4_P8_NEXT_PART_ID,
  C4_P8_PART_ID,
  C4_P8_RETELL_OPTIONS,
  C4_P8_RUN_EVIDENCE,
  C4_P8_SEAL_ID,
  C4_P8_STORY_BEFORE,
  C4_P8_TEXT_EVIDENCE,
  c4p8CardsOrdered,
  c4p8Correct,
  type C4P8ContinueChoice,
} from './journeyWestC4Part8Program'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { Choice, OrderCards } from './partUi'

const STORY_MAP_PATH = '/learn/story/journey-west'

export function JourneyWestC4Part8Page({ previewSleep = async () => undefined }: { previewSleep?: (ms: number) => Promise<void> }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useMe()
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID], queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID) })
  const build = useQuery({ queryKey: ['jtw-c4-p7-build', kidId], queryFn: () => findC4PersonalShipBuild(kidId!), enabled: Boolean(kidId) })
  const [cards, setCards] = useState<string[]>([])
  const [flagTrace, setFlagTrace] = useState<BlockOp[]>([])
  const [tapTrace, setTapTrace] = useState<BlockOp[]>([])
  const [retell, setRetell] = useState<string | null>(null)
  const [textEvidence, setTextEvidence] = useState<string | null>(null)
  const [runEvidence, setRunEvidence] = useState<string | null>(null)
  const [debugEvidence, setDebugEvidence] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)
  const runnerRef = useRef<BlocksRunner | null>(null)
  const activeTrace = useRef<'flag' | 'tap' | null>(null)
  const saved = progress.data?.completed.find((entry) => entry.part_id === C4_P8_PART_ID)
  const unlocked = progress.data?.unlocked_part_ids.includes(C4_P8_PART_ID) ?? false
  const seal = progress.data?.chapter_seals?.find((entry) => entry.seal_id === C4_P8_SEAL_ID)

  if (saved && !restored) {
    const evidence = saved.evidence as StoryPartEvidence
    setCards(evidence.selections?.cause_card_order ?? [])
    setFlagTrace((evidence.selections?.flag_trace ?? []) as BlockOp[])
    setTapTrace((evidence.selections?.tap_trace ?? []) as BlockOp[])
    setRetell(evidence.selections?.retell_links?.[0] ?? null)
    setTextEvidence(evidence.selections?.text_evidence?.[0] ?? null)
    setRunEvidence(evidence.selections?.run_evidence?.[0] ?? null)
    setDebugEvidence(evidence.selections?.debug_evidence?.[0] ?? null)
    setRestored(true)
  }

  const makeRunner = () => {
    const page = build.data!.project.pages[0]
    const character = page.characters.find((entry) => entry.id === JTW_C4_WUKONG_ID)!
    const runner = new BlocksRunner(page, {
      onSprite: () => undefined,
      onSay: () => undefined,
      onNote: () => undefined,
      onSound: () => undefined,
      onGotoPage: () => undefined,
      onStep: (_characterId, scriptId, blockIndex) => {
        if (blockIndex < 0) return
        const op = character.scripts.find((script) => script.id === scriptId)?.blocks[blockIndex]?.op
        if (!op) return
        if (activeTrace.current === 'flag') setFlagTrace((current) => [...current, op])
        if (activeTrace.current === 'tap') setTapTrace((current) => [...current, op])
      },
    }, previewSleep)
    runnerRef.current = runner
    return runner
  }

  const runFlag = async () => {
    if (!build.data || !c4p8CardsOrdered(cards)) return
    setFlagTrace(['when_flag'])
    setTapTrace([])
    activeTrace.current = 'flag'
    await makeRunner().runFlag()
    activeTrace.current = null
  }

  const runTap = async () => {
    if (!runnerRef.current || flagTrace.at(-1) !== 'end') return
    setTapTrace(['when_tap'])
    activeTrace.current = 'tap'
    await runnerRef.current.runTap(JTW_C4_WUKONG_ID)
    activeTrace.current = null
  }

  const runDone = flagTrace[0] === 'when_flag' && flagTrace.at(-1) === 'end' && tapTrace[0] === 'when_tap' && tapTrace.at(-1) === 'end'
  const evidenceDone = c4p8Correct(C4_P8_RETELL_OPTIONS, retell) && c4p8Correct(C4_P8_TEXT_EVIDENCE, textEvidence) && c4p8Correct(C4_P8_RUN_EVIDENCE, runEvidence) && c4p8Correct(C4_P8_DEBUG_EVIDENCE, debugEvidence)
  const resolved = Boolean(build.data && c4p8CardsOrdered(cards) && runDone && evidenceDone)

  const finish = useMutation({
    mutationFn: (choice: C4P8ContinueChoice | null) => completeStoryPart(JTW_S1_STORY_LINE_ID, C4_P8_PART_ID, {
      schema_version: 1,
      selections: {
        ...saved?.evidence.selections,
        cause_card_order: cards,
        retell_links: retell ? [retell] : [],
        text_evidence: textEvidence ? [textEvidence] : [],
        run_evidence: runEvidence ? [runEvidence] : [],
        debug_evidence: debugEvidence ? [debugEvidence] : [],
        run_project: build.data?.projectId ? [build.data.projectId] : [],
        run_saved_version: build.data ? [String(build.data.savedVersion)] : [],
        flag_trace: flagTrace,
        tap_trace: tapTrace,
        continue_choice: choice ? [choice] : [],
      },
    }),
    onSuccess: async (_result, choice) => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] })
      if (choice === 'now') navigate(STORY_MAP_PATH, { state: { unlocked: C4_P8_NEXT_PART_ID } })
    },
  })

  if (progress.isLoading) return <p className="p-8 text-center">名字牌正在等最后一次讲回…</p>
  if (!unlocked && !saved) return <div className="p-8 text-center" data-testid="jtw-c4p8-locked"><Link to={STORY_MAP_PATH}>先完成个人认识卡</Link></div>

  return <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p8">
    <header><p className="text-xs font-bold text-brand-sky">西游记 · 第四章 · Part 8 · Retell</p><h1 className="text-3xl font-black">名字跟着他回家</h1></header>
    <section className="space-y-3" data-testid="jtw-c4p8-story">{C4_P8_STORY_BEFORE.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<aside className="rounded-2xl bg-wash-sunshine p-4"><strong>Classic Card：</strong>{C4_P8_CLASSIC_CARD}</aside></section>
    <OrderCards title="① 把六张因果卡按故事顺序排好" options={C4_P8_CAUSE_CARDS} order={cards} onChange={setCards} done={c4p8CardsOrdered(cards)} testId="jtw-c4p8-cards" />
    {!build.data && <section data-testid="jtw-c4p8-work-missing"><p>没有找到 Part 7 真正保存的《Meet Sun Wukong》。这一页不会载入答案项目。</p><Link to="/learn/story/journey-west/jtw-s1-c4-p7">回 Part 7 保存并重开作品</Link></section>}
    {build.data && <section className="space-y-3 rounded-2xl bg-wash-sky p-5"><p>作品版本：VFS {build.data.savedVersion} · {build.data.version}</p><button className="btn-pill-primary" data-testid="jtw-c4p8-go" disabled={!c4p8CardsOrdered(cards)} onClick={() => void runFlag()}>🚩 Go：只运行名字链</button><p data-testid="jtw-c4p8-flag-trace">{flagTrace.join(' → ') || '尚未运行'}</p><button className="btn-pill-primary" data-testid="jtw-c4p8-tap" disabled={flagTrace.at(-1) !== 'end'} onClick={() => void runTap()}>👆 真实 Tap 悟空</button><p data-testid="jtw-c4p8-tap-trace">{tapTrace.join(' → ') || '本领仍在等待邀请'}</p></section>}
    {runDone && <section className="space-y-4"><EvidenceChoice title="② 用因为—所以—结果—后来讲回" options={C4_P8_RETELL_OPTIONS} selected={retell} onSelect={setRetell} /><EvidenceChoice title="③ 指出文字动机证据" options={C4_P8_TEXT_EVIDENCE} selected={textEvidence} onSelect={setTextEvidence} /><EvidenceChoice title="④ 指出这次双事件运行证据" options={C4_P8_RUN_EVIDENCE} selected={runEvidence} onSelect={setRunEvidence} /><EvidenceChoice title="⑤ 指出 P6 的第一次偏离" options={C4_P8_DEBUG_EVIDENCE} selected={debugEvidence} onSelect={setDebugEvidence} /></section>}
    {(resolved || saved) && <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c4p8-resolved"><h2 className="font-black">得名印和名字牌稳定亮起</h2><p>悟空带着新名字和来处回到花果山。海面深处出现一根巨大柱影：下一章要寻找大小合适的工具。</p></section>}
    {!saved && <button className="btn-pill-primary w-full" data-testid="jtw-c4p8-complete" disabled={!resolved || finish.isPending} onClick={() => finish.mutate(null)}>点亮得名印</button>}
    {saved && <section data-testid="jtw-c4p8-seal" data-lit={seal?.lit ? 'true' : 'false'}><p>{seal?.lit ? '得名印已由服务器聚合点亮。' : `服务器仍缺 ${seal?.missing.length ?? 0} 项证据。`}</p><div className="flex gap-3"><button className="btn-pill-primary" onClick={() => finish.mutate('now')}>看看海中柱影</button><button className="btn-pill-secondary" onClick={() => finish.mutate('later')}>以后继续</button></div></section>}
  </div>
}

function EvidenceChoice({ title, options, selected, onSelect }: { title: string; options: Array<{ id: string; label: string; correct?: boolean }>; selected: string | null; onSelect: (id: string) => void }) {
  return <div><h2 className="mb-2 font-bold">{title}</h2><div className="flex flex-col gap-2">{options.map((option) => <Choice key={option.id} option={option} active={selected === option.id} onPick={() => onSelect(option.id)} />)}</div></div>
}
