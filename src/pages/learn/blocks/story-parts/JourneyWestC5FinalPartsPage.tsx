import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import type { BlockOp, BlocksProject } from '../blocksModel'
import { BlocksRunner } from '../interpreter'
import { createBlocksProject, loadBlocksProject, saveBlocksProject } from '../blocksApi'
import { Choice, OrderCards } from './partUi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { C5_DEBUG_BUG, C5_DEBUG_FIXED, C5_RETELL_ORDER, c5PersonalProject, c5Portable, type C5PartId } from './journeyWestC5Program'

type FinalPartId = Extract<C5PartId, 'jtw-s1-c5-p6' | 'jtw-s1-c5-p7' | 'jtw-s1-c5-p8'>
const MAP = '/learn/story/journey-west'
const NEXT: Record<FinalPartId, string> = { 'jtw-s1-c5-p6': 'jtw-s1-c5-p7', 'jtw-s1-c5-p7': 'jtw-s1-c5-p8', 'jtw-s1-c5-p8': 'jtw-s1-c6-p1' }
const RETELL_CARDS = [
  { id: 'learned-home', label: '学成回家', correct: true }, { id: 'tools-unfit', label: '旧物不合适', correct: true },
  { id: 'dragon-palace', label: '去龙宫', correct: true }, { id: 'state-test', label: '试验状态', correct: true },
  { id: 'fix-reset', label: '修 Reset', correct: true }, { id: 'carry-staff', label: '带走金箍棒', correct: true },
]

async function runProject(project: BlocksProject, sleep: (ms: number) => Promise<void>) {
  const trace: string[] = []
  const runner = new BlocksRunner(project.pages[0], {
    onSprite: (_id, state) => trace.push(`size:${state.size}`), onSay: () => undefined,
    onNote: () => undefined, onSound: () => undefined, onGotoPage: () => undefined,
    onStep: (_id, _script, index) => { if (index >= 0) trace.push(project.pages[0].characters[0].scripts[0].blocks[index]?.op ?? '') },
  }, sleep)
  await runner.runFlag()
  return [...trace, `final:${runner.state('ruyi-staff')?.size}`]
}

export function JourneyWestC5FinalPartsPage({ partId, previewSleep = async () => undefined }: { partId: FinalPartId; previewSleep?: (ms: number) => Promise<void> }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const progress = useQuery({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID], queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID) })
  const saved = progress.data?.completed.find((entry) => entry.part_id === partId)
  const p5 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c5-p5')
  const p7 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c5-p7')
  const p7ProjectId = (p7?.evidence as StoryPartEvidence | undefined)?.selections.build_project?.[0]
  const p7Build = useQuery({ queryKey: ['jtw-c5-p7-build', p7ProjectId], queryFn: () => loadBlocksProject(p7ProjectId!), enabled: partId === 'jtw-s1-c5-p8' && Boolean(p7ProjectId) })
  const [prediction, setPrediction] = useState<string | null>(null)
  const [bugTrace, setBugTrace] = useState<string[]>([])
  const [fixedTrace, setFixedTrace] = useState<string[]>([])
  const [repeatTrace, setRepeatTrace] = useState<string[]>([])
  const [firstBreak, setFirstBreak] = useState<string | null>(null)
  const [fixed, setFixed] = useState(false)
  const [ops, setOps] = useState<BlockOp[]>(['grow', 'wait', 'reset_size', 'shrink', 'wait'])
  const [waitSeconds, setWaitSeconds] = useState(3)
  const [personalTrace, setPersonalTrace] = useState<string[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [savedVersion, setSavedVersion] = useState<number | null>(null)
  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [reopened, setReopened] = useState(false)
  const [peer, setPeer] = useState<string | null>(null)
  const [cards, setCards] = useState<string[]>([])
  const [retell, setRetell] = useState<string | null>(null)
  const [rights, setRights] = useState<string | null>(null)
  const [p8Trace, setP8Trace] = useState<string[]>([])
  const seal = progress.data?.chapter_seals?.find((entry) => entry.seal_id === 'jtw-s1-c5-ruyi-seal')

  const unlocked = progress.data?.unlocked_part_ids.includes(partId) ?? false
  const p6Done = prediction === 'small-before-bug' && bugTrace.at(-1) === 'final:2' && firstBreak === 'last-reset' && fixed && fixedTrace.at(-1) === 'final:1.8' && fixedTrace.join('|') === repeatTrace.join('|')
  const p7Done = prediction === 'three-stops-small' && personalTrace.at(-1) === 'final:1.8' && Boolean(projectId && savedVersion && reopened && peer === 'three-uses')
  const p8Done = cards.join('|') === C5_RETELL_ORDER.join('|') && prediction === 'saved-last-shrink' && p8Trace.at(-1) === 'final:1.8' && retell === 'because-so-result-later' && rights === 'source-conflict-muted-not-gift'
  const done = partId === 'jtw-s1-c5-p6' ? p6Done : partId === 'jtw-s1-c5-p7' ? p7Done : p8Done

  const savePersonal = async () => {
    const project = c5PersonalProject(ops, waitSeconds)
    const created = await createBlocksProject({ title: 'Ruyi Staff Size Story', template: 'blocks_blank' })
    const blank = await loadBlocksProject(created.id)
    const result = await saveBlocksProject({ projectId: created.id, project, version: blank.version, otherFiles: blank.otherFiles, history: { past: [], future: [] }, storyProgress: { schemaVersion: 1, completed: { 'jtw-s1-c5-p7': { completedAt: new Date().toISOString() } } } })
    if (result.status !== 'saved') return
    setProjectId(created.id); setSavedVersion(result.version); setSnapshot(JSON.stringify(project)); setReopened(false)
  }
  const verifyReopen = async () => { if (!projectId || !snapshot) return; const loaded = await loadBlocksProject(projectId); setReopened(JSON.stringify(loaded.project) === snapshot) }

  const complete = useMutation({ mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, partId, { schema_version: 1, prediction: prediction ?? undefined, selections: {
    bug_trace: bugTrace, first_break: firstBreak ? [firstBreak] : [], debug_diff: fixed ? ['move-reset-before-shrink-only'] : [], repaired_trace: fixedTrace, repeat_trace: repeatTrace,
    build_project: projectId ? [projectId] : [], saved_version: savedVersion ? [String(savedVersion)] : [], reopen_json_match: reopened ? ['true'] : [], peer_retell: peer ? [peer] : [], runner_result: personalTrace,
    cause_card_order: cards, retell_links: retell ? [retell] : [], rights_boundary: rights ? [rights] : [], run_trace: p8Trace,
    carried_p5_project: (p5?.evidence as StoryPartEvidence | undefined)?.selections.choice_ops ?? [],
  } }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] }); navigate(MAP, { state: { unlocked: NEXT[partId] } }) } })

  if (progress.isLoading) return <p className="p-8 text-center">如意印正在读取证据…</p>
  if (!unlocked && !saved) return <div className="p-8 text-center"><Link to={MAP}>先完成上一 Part</Link></div>
  return <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid={`jtw-${partId}`}>
    <header><p className="text-xs font-bold text-brand-sky">西游记 · 第五章 · Part {partId.at(-1)}</p><h1 className="text-3xl font-black">{partId.endsWith('p6') ? 'Reset 站错了结尾' : partId.endsWith('p7') ? '我的如意大小故事' : '带走宝物，也讲清结果'}</h1></header>
    {partId === 'jtw-s1-c5-p6' && <><p>末尾藏着 Reset。先预测，再运行错误版；第一次偏离必须落在真正改变结尾的那一块。</p><Choice option={{ id: 'small-before-bug', label: '我预测应是小；若回原，第一次偏离在末尾 Reset', correct: true }} active={prediction === 'small-before-bug'} onPick={() => setPrediction('small-before-bug')} /><button data-testid="jtw-c5p6-bug" className="btn-pill-primary" disabled={!prediction} onClick={async () => setBugTrace(await runProject({ version: 1, name: 'bug', pages: [ { ...c5PersonalProject([], 1).pages[0], characters: [{ ...c5PersonalProject([], 1).pages[0].characters[0], scripts: [{ id: 'debug', blocks: C5_DEBUG_BUG }] }] } ] }, previewSleep))}>运行错误版</button>{bugTrace.length > 0 && <><Trace values={bugTrace} /><Choice option={{ id: 'last-reset', label: '第一次偏离：最后 Reset 把小状态改回初始', correct: true }} active={firstBreak === 'last-reset'} onPick={() => setFirstBreak('last-reset')} /><button className="btn-pill-secondary" disabled={firstBreak !== 'last-reset'} onClick={() => setFixed(true)}>只把 Reset 移到中间</button></>}{fixed && <div className="flex gap-2"><button data-testid="jtw-c5p6-fixed" className="btn-pill-primary" onClick={async () => setFixedTrace(await runProject({ version: 1, name: 'fixed', pages: [{ ...c5PersonalProject([], 1).pages[0], characters: [{ ...c5PersonalProject([], 1).pages[0].characters[0], scripts: [{ id: 'debug', blocks: C5_DEBUG_FIXED }] }] }] }, previewSleep))}>修复后运行</button><button className="btn-pill-secondary" disabled={!fixedTrace.length} onClick={async () => setRepeatTrace(await runProject({ version: 1, name: 'fixed', pages: [{ ...c5PersonalProject([], 1).pages[0], characters: [{ ...c5PersonalProject([], 1).pages[0].characters[0], scripts: [{ id: 'debug', blocks: C5_DEBUG_FIXED }] }] }] }, previewSleep))}>一致性重跑</button></div>}<Trace values={fixedTrace} /><Trace values={repeatTrace} /></>}
    {partId === 'jtw-s1-c5-p7' && <><p>给三个状态安排可读停点和用途，保存为真正的 VFS 作品，再关闭重开核对。</p><Choice option={{ id: 'three-stops-small', label: '三个停点，最后小状态可携带', correct: true }} active={prediction === 'three-stops-small'} onPick={() => setPrediction('three-stops-small')} /><div className="flex gap-2"><button className="btn-pill-secondary" onClick={() => setWaitSeconds((value) => value === 3 ? 5 : 3)}>Wait 节奏：{waitSeconds}</button><button className="btn-pill-secondary" onClick={() => setOps((current) => current[1] === 'wait' ? ['grow', 'reset_size', 'wait', 'shrink', 'wait'] : ['grow', 'wait', 'reset_size', 'shrink', 'wait'])}>移动中间 Wait</button></div><button data-testid="jtw-c5p7-run" className="btn-pill-primary" disabled={!prediction || !c5Portable(ops)} onClick={async () => setPersonalTrace(await runProject(c5PersonalProject(ops, waitSeconds), previewSleep))}>运行个人故事</button><Trace values={personalTrace} /><button data-testid="jtw-c5p7-save" className="btn-pill-primary" disabled={personalTrace.at(-1) !== 'final:1.8'} onClick={() => void savePersonal()}>保存 Ruyi Staff Size Story</button>{projectId && <><p>VFS {savedVersion} · {projectId}</p><button data-testid="jtw-c5p7-reopen" className="btn-pill-secondary" onClick={() => void verifyReopen()}>关闭后重开核对 JSON</button></>} {reopened && <Choice option={{ id: 'three-uses', label: '同伴从真实运行讲出原貌、比较、携带三段用途', correct: true }} active={peer === 'three-uses'} onPick={() => setPeer('three-uses')} />}</>}
    {partId === 'jtw-s1-c5-p8' && <><p>原著保留到龙宫、选中、取得和能变大小；课程淡出争执与压力，但不改写成快乐赠礼。</p><OrderCards title="排列六张章节因果卡" options={RETELL_CARDS} order={cards} onChange={setCards} done={cards.join('|') === C5_RETELL_ORDER.join('|')} testId="jtw-c5p8-cards" /><Choice option={{ id: 'saved-last-shrink', label: 'P7 保存版最后是 Shrink，预期为携带小状态', correct: true }} active={prediction === 'saved-last-shrink'} onPick={() => setPrediction('saved-last-shrink')} /><button data-testid="jtw-c5p8-run" className="btn-pill-primary" disabled={!p7Build.data || !prediction} onClick={async () => setP8Trace(await runProject(p7Build.data!.project, previewSleep))}>加载 P7 版本并 Go</button><Trace values={p8Trace} />{p8Trace.at(-1) === 'final:1.8' && <><Choice option={{ id: 'because-so-result-later', label: '因为需要合适工具，所以试验三态；结果修好 Reset，后来安全带走', correct: true }} active={retell === 'because-so-result-later'} onPick={() => setRetell('because-so-result-later')} /><Choice option={{ id: 'source-conflict-muted-not-gift', label: '原著有要求、争执和压力；课程淡出但不说成快乐赠礼', correct: true }} active={rights === 'source-conflict-muted-not-gift'} onPick={() => setRights('source-conflict-muted-not-gift')} /></>}</>}
    {(done || saved) && <section data-testid="jtw-c5-final-resolved" className="rounded-2xl bg-wash-mint p-5">{partId.endsWith('p8') ? `如意印：${seal?.lit ? '服务器已点亮' : `仍缺 ${seal?.missing.length ?? 0} 项证据`}。云路上的任务标记正在出现。` : '金箍棒停在安全大小，通路保持打开；下一段因果已经出现。'}</section>}
    <button data-testid="jtw-c5-final-complete" className="btn-pill-primary w-full" disabled={(!done && !saved) || complete.isPending} onClick={() => complete.mutate()}>继续故事</button>
  </div>
}

function Trace({ values }: { values: string[] }) { return values.length ? <p data-testid="jtw-c5-final-trace" className="rounded-xl bg-wash-sky p-3">{values.join(' → ')}</p> : null }
