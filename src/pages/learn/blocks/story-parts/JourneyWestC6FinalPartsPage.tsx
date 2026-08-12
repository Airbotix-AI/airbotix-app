import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import { useMe } from '@/auth/useAuth'
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi'
import { jtwC5C6BuildMatches } from '../jtwC5C6Builds'
import { Choice, OrderCards } from './partUi'
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { C6_EVENT_ORDER, PAGE_ONE, PAGE_THREE_BUG, PAGE_TWO, PAGE_TWO_BUG, c6Project, runC6 } from './journeyWestC6Program'

type PartId = `jtw-s1-c6-p${3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`
const MAP = '/learn/story/journey-west'
const NEXT: Record<PartId, string> = { 'jtw-s1-c6-p3': 'jtw-s1-c6-p4', 'jtw-s1-c6-p4': 'jtw-s1-c6-p5', 'jtw-s1-c6-p5': 'jtw-s1-c6-p6', 'jtw-s1-c6-p6': 'jtw-s1-c6-p7', 'jtw-s1-c6-p7': 'jtw-s1-c6-p8', 'jtw-s1-c6-p8': 'jtw-s1-c6-p9', 'jtw-s1-c6-p9': 'jtw-s1-c6-p10', 'jtw-s1-c6-p10': 'jtw-s2-c1-p1' }
const TITLES: Record<PartId, string> = { 'jtw-s1-c6-p3': '六件事不能同时发生', 'jtw-s1-c6-p4': '第一页把身份冲突讲清楚', 'jtw-s1-c6-p5': '第二页让行动与回应分开', 'jtw-s1-c6-p6': '我的前传节奏', 'jtw-s1-c6-p7': '到了五行山却没有结束', 'jtw-s1-c6-p8': '我的三页美猴王前传', 'jtw-s1-c6-p9': '六枚印与四个因为', 'jtw-s1-c6-p10': '第一程完整结束' }
const EVENT_CARDS = C6_EVENT_ORDER.map((id, index) => ({ id, label: ['任职不满', '离开', '自立称号', '再次入天宫', '风波升级', '五行山结果'][index], correct: true }))

export function JourneyWestC6FinalPartsPage({ partId, previewSleep = async () => undefined }: { partId: PartId; previewSleep?: (ms: number) => Promise<void> }) {
  const navigate = useNavigate(); const queryClient = useQueryClient()
  const me = useMe(); const kidId = me.data?.kind === 'kid' ? me.data.sub : null
  const progress = useQuery({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID], queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID) })
  const saved = progress.data?.completed.find((entry) => entry.part_id === partId)
  const p8 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c6-p8')
  const p8ProjectId = (p8?.evidence as StoryPartEvidence | undefined)?.selections.build_project?.[0]
  const p8Build = useQuery({ queryKey: ['jtw-c6-p8-build', p8ProjectId], queryFn: () => loadBlocksProject(p8ProjectId!), enabled: (partId.endsWith('p9') || partId.endsWith('p10')) && Boolean(p8ProjectId) })
  const studioBuild = useQuery({ queryKey: ['jtw-c6-studio-build', partId, kidId], enabled: Boolean(kidId) && [4, 5, 8].includes(Number(partId.split('p').at(-1))), queryFn: async () => {
    for (const meta of (await listBlocksProjects(kidId!)).slice(0, 15)) {
      const loaded = await loadBlocksProject(meta.id)
      if (jtwC5C6BuildMatches(loaded.project, partId) && loaded.storyProgress?.completed?.[partId]) return { projectId: meta.id, version: loaded.version, snapshot: JSON.stringify(loaded.project), project: loaded.project }
    }
    return null
  } })
  const [cards, setCards] = useState<string[]>([]); const [prediction, setPrediction] = useState<string | null>(null)
  const [reasons, setReasons] = useState<string[]>([]); const [trace, setTrace] = useState<string[]>([])
  const [bugTrace, setBugTrace] = useState<string[]>([]); const [fixed, setFixed] = useState(false); const [repeatTrace, setRepeatTrace] = useState<string[]>([])
  const [reopened, setReopened] = useState(false)
  const [peer, setPeer] = useState(false); const [retell, setRetell] = useState<string[]>([]); const [later, setLater] = useState(false)
  const seal = progress.data?.chapter_seals?.find((entry) => entry.seal_id === 'jtw-s1-c6-first-journey-seal')
  const number = Number(partId.split('p').at(-1))
  const exactOrder = cards.join('|') === C6_EVENT_ORDER.join('|')
  const done = saved || (number === 3 && exactOrder && reasons.length === 2 && trace.length > 0) || (number === 4 && Boolean(studioBuild.data) && reasons.length === 2) || (number === 5 && Boolean(studioBuild.data) && reasons.length === 2) || (number === 6 && reasons.length >= 3 && trace.length > 0 && peer) || (number === 7 && bugTrace.some((item) => item.includes('planned:forever')) && fixed && trace.at(-1)?.includes('end') && trace.join('|') === repeatTrace.join('|')) || (number === 8 && Boolean(studioBuild.data) && reopened && trace.at(-1)?.includes('end') && peer) || (number === 9 && retell.length === 4 && trace.length > 0 && peer) || (number === 10 && trace.at(-1)?.includes('end') && prediction === 'stable-mountain' && reasons.length === 2)

  const run = async () => setTrace(await runC6(c6Project(), previewSleep))
  const openStudio = async () => { if (studioBuild.data) return navigate(`/learn/blocks/${studioBuild.data.projectId}`); const template = number === 4 ? 'blocks_jtw_c6_p4' : number === 5 ? 'blocks_jtw_c6_p5' : 'blocks_jtw_c6_p8'; const created = await createBlocksProject({ title: TITLES[partId], template }); navigate(`/learn/blocks/${created.id}`) }
  const reopen = async () => { if (!studioBuild.data) return; const loaded = await loadBlocksProject(studioBuild.data.projectId); setReopened(JSON.stringify(loaded.project) === studioBuild.data.snapshot && jtwC5C6BuildMatches(loaded.project)) }
  const complete = useMutation({ mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, partId, { schema_version: 1, prediction: prediction ?? undefined, selections: {
    event_order: cards, page_groups: exactOrder ? ['p1:job-leave-title', 'p2:return-response', 'p3:mountain'] : [], wait_reasons: reasons, preview_trace: trace,
    build_ast: studioBuild.data ? ['saved-studio-ast'] : [], cause_links: reasons, run_trace: trace, before_ast: number === 5 ? PAGE_TWO_BUG.map((item) => item.op) : [], after_ast: number === 5 ? PAGE_TWO.map((item) => item.op) : [], peer_order: peer ? ['confirmed'] : [], personal_choices: reasons,
    bug_trace: bugTrace, first_break: fixed ? ['forever'] : [], debug_diff: fixed ? ['remove-stop-forever-add-end'] : [], repaired_trace: trace, repeat_trace: repeatTrace,
    build_project: studioBuild.data ? [studioBuild.data.projectId] : p8ProjectId ? [p8ProjectId] : [], saved_version: studioBuild.data ? [String(studioBuild.data.version)] : [], reopen_json_match: reopened ? ['true'] : [], peer_retell: peer ? ['same-version'] : [], three_page_trace: trace,
    retell_links: retell, visual_evidence: retell, aggregate_readback: number === 10 ? ['ten-parts', 'read-why-code-run-debug-retell-save'] : [], rights_celebration: reasons,
  } }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] }); navigate(MAP, { state: { unlocked: NEXT[partId] } }) } })

  if (progress.isLoading) return <p className="p-8 text-center">正在读取第一程证据…</p>
  if (!(progress.data?.unlocked_part_ids.includes(partId) || saved)) return <div className="p-8 text-center"><Link to={MAP}>先完成上一 Part</Link></div>
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8" data-testid={`jtw-${partId}`}><header><p className="text-xs font-bold text-brand-sky">西游记 · 第六章 · Part {number}</p><h1 className="text-3xl font-black">{TITLES[partId]}</h1></header>
    {number === 3 && <><p>六件事同时发生会看不清因果。先排序，再用三页和两个停点让观众读懂。</p><OrderCards title="排列六件事" options={EVENT_CARDS} order={cards} onChange={setCards} done={exactOrder} testId="jtw-c6p3-order" /><Multi choices={['Page 1：身份到称号', 'Page 2：再次邀请到回应']} values={reasons} set={setReasons} /><button className="btn-pill-primary" disabled={!exactOrder || reasons.length < 2} onClick={() => void run()}>逐页预览</button></>}
    {number === 4 && <StudioTask title="搭 Page 1：两句、移动、停点、Page 出口" ready={Boolean(studioBuild.data)} reasons={reasons} setReasons={setReasons} open={openStudio} />}
    {number === 5 && <StudioTask title="重排 Page 2：行动、回应、时间影、Page 出口" ready={Boolean(studioBuild.data)} reasons={reasons} setReasons={setReasons} open={openStudio} />}
    {number === 6 && <><p>载入两页成功链，改变一处 Wait、速度和 Tap/金箍棒状态，让伙伴听出分界。</p><Multi choices={['Page 1 Wait 改为 3', 'Page 2 选择 Slow', 'Tap 本领 + Shrink 携带']} values={reasons} set={setReasons} /><button className="btn-pill-primary" disabled={reasons.length < 3} onClick={() => void run()}>运行我的节奏</button>{trace.length > 0 && <Choice option={{ id: 'peer', label: '伙伴指出行动与回应分界', correct: true }} active={peer} onPick={() => setPeer(true)} />}</>}
    {number === 7 && <><p>预期在五行山稳定结束。先运行错误版，定位第一次偏离，再只换成 End。</p><button className="btn-pill-primary" onClick={async () => setBugTrace(await runC6(c6Project(PAGE_ONE, PAGE_TWO, PAGE_THREE_BUG), previewSleep))}>运行 Stop + Again 错误版</button>{bugTrace.length > 0 && <button className="btn-pill-secondary" onClick={() => setFixed(true)}>第一次偏离在 Again；换成 End</button>}{fixed && <><button className="btn-pill-primary" onClick={() => void run()}>修复后运行</button><button className="btn-pill-secondary" disabled={!trace.length} onClick={async () => setRepeatTrace(await runC6(c6Project(), previewSleep))}>一致性重跑</button></>}</>}
    {number === 8 && <><p>三页作品至少18块、三处事件入口、两处节奏、两个Page出口和稳定End；必须在Blocks Studio逐页搭完并运行，保存后关闭重开。</p><Choice option={{ id: 'three-page-plan', label: '我画好三页停点，并预测最终稳定 End', correct: true }} active={prediction === 'three-page-plan'} onPick={() => setPrediction('three-page-plan')} /><button className="btn-pill-primary" disabled={!prediction} onClick={() => void openStudio()}>{studioBuild.data ? '重开三页Blocks Studio作品' : '打开三页Blocks Studio搭建'}</button>{studioBuild.data && <><button className="btn-pill-primary" onClick={async () => setTrace(await runC6(studioBuild.data!.project, previewSleep))}>运行保存的三页版本</button><button className="btn-pill-secondary" disabled={!trace.at(-1)?.includes('end')} onClick={() => void reopen()}>关闭并重开核对三页 JSON</button></>}{reopened && <Choice option={{ id: 'peer', label: '伙伴从第一页预测后两页', correct: true }} active={peer} onPick={() => setPeer(true)} />}</>}
    {number === 9 && <><p>加载 P8 同一版本，从第一页运行，再独立讲回四个“因为”。</p><button className="btn-pill-primary" disabled={!p8Build.data} onClick={async () => setTrace(await runC6(p8Build.data!.project, previewSleep))}>运行 P8 保存版</button>{trace.length > 0 && <><Multi choices={['因为身份安排不合适', '所以离开并自立称号', '结果再次邀请仍有风波', '后来停在五行山等待']} values={retell} set={setRetell} /><Choice option={{ id: 'peer', label: '伙伴在同一版本找到四处画面证据', correct: true }} active={peer} onPick={() => setPeer(true)} /></>}</>}
    {number === 10 && <><p>最后一次加载同一作品，核对十个 Part 与 Read/Why/Code/Run/Debug/Retell/保存重开证据。庆祝孩子的阅读、程序、测试和讲回。</p><Choice option={{ id: 'stable-mountain', label: '最终稳定停在五行山', correct: true }} active={prediction === 'stable-mountain'} onPick={() => setPrediction('stable-mountain')} /><Multi choices={['课程淡出战斗但不反写后果', '彩带只围绕孩子作品']} values={reasons} set={setReasons} /><button className="btn-pill-primary" disabled={!p8Build.data || !prediction || reasons.length < 2} onClick={async () => setTrace(await runC6(p8Build.data!.project, previewSleep))}>最终运行到 End</button></>}
    {trace.length > 0 && <p data-testid="jtw-c6-trace" className="rounded-xl bg-wash-sky p-3">{trace.join(' → ')}</p>}{(done || saved) && <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c6-resolved">{number === 10 ? `第一程印：${seal?.lit ? '服务器已点亮' : `仍缺 ${seal?.missing.length ?? 0} 项`}。六章完整收束。` : `世界变化已保存；下一段是 ${NEXT[partId]}。`}</section>}
    <button data-testid="jtw-c6-complete" className="btn-pill-primary w-full" disabled={!done || complete.isPending} onClick={() => complete.mutate()}>继续故事</button>{number === 10 && done && <button className="btn-pill-ghost w-full" onClick={() => setLater(true)}>{later ? '位置已保存' : '以后继续'}</button>}
  </div>
}

function Multi({ choices, values, set }: { choices: string[]; values: string[]; set: (value: string[]) => void }) { return <div className="flex flex-wrap gap-2">{choices.map((choice, index) => { const id = `${index}:${choice}`; return <button key={id} className="btn-pill-secondary" aria-pressed={values.includes(id)} onClick={() => set(values.includes(id) ? values.filter((item) => item !== id) : [...values, id])}>{choice}</button> })}</div> }
function StudioTask({ title, ready, reasons, setReasons, open }: { title: string; ready: boolean; reasons: string[]; setReasons: (value: string[]) => void; open: () => Promise<void> }) { return <><p>{title}</p><Multi choices={['原因连接 1', '原因连接 2']} values={reasons} set={setReasons} /><button className="btn-pill-primary" onClick={() => void open()}>{ready ? '重开已保存的Blocks Studio项目' : '打开Blocks Studio亲手搭建'}</button></> }
