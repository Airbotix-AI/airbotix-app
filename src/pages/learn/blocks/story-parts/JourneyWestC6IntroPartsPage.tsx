import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import { Choice, EvidenceGroup, OrderCards } from './partUi'
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1'
import { completeStoryPart, fetchStoryLineProgress } from './storyPartsApi'

type PartId = 'jtw-s1-c6-p1' | 'jtw-s1-c6-p2'
const MAP = '/learn/story/journey-west'
const SEALS = ['birth', 'water-curtain', 'journey', 'name-skills', 'ruyi-staff', 'heaven']
const SEAL_CARDS = [
  { id: 'birth', label: '仙石', correct: true }, { id: 'water-curtain', label: '水帘洞', correct: true }, { id: 'journey', label: '远行', correct: true },
  { id: 'name-skills', label: '得名学艺', correct: true }, { id: 'ruyi-staff', label: '金箍棒', correct: true }, { id: 'heaven', label: '天宫', correct: true },
]
const FOUR = [
  { id: 'wish-important-work', label: '愿望：得到重要而合适的工作', correct: true }, { id: 'assignment-horses', label: '安排：照看天马', correct: true },
  { id: 'feeling-unseen', label: '感受：本领没有被看见', correct: true }, { id: 'choice-leave', label: '选择：没有谈清就离开', correct: true },
]

export function JourneyWestC6IntroPartsPage({ partId }: { partId: PartId }) {
  const navigate = useNavigate(); const queryClient = useQueryClient()
  const progress = useQuery({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID], queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID) })
  const saved = progress.data?.completed.find((entry) => entry.part_id === partId)
  const [cards, setCards] = useState<string[]>([]); const [evidence, setEvidence] = useState<string[]>([]); const [prediction, setPrediction] = useState<string | null>(null)
  const p1Done = cards.join('|') === SEALS.join('|') && evidence.includes('wish-important-work') && evidence.includes('assignment-horses') && prediction === 'expectation-gap'
  const p2Done = FOUR.every((item) => evidence.includes(item.id)) && prediction === 'leaving-does-not-solve'
  const done = partId.endsWith('p1') ? p1Done : p2Done
  const complete = useMutation({ mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, partId, { schema_version: 1, prediction: prediction ?? undefined, selections: { seal_order: cards, expectation_evidence: partId.endsWith('p1') ? evidence : [], motive_choice_evidence: partId.endsWith('p2') ? evidence : [], causal_sentence: prediction ? [prediction] : [] } }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] }); navigate(MAP, { state: { unlocked: partId.endsWith('p1') ? 'jtw-s1-c6-p2' : 'jtw-s1-c6-p3' } }) } })
  if (progress.isLoading) return <p className="p-8 text-center">云门正在展开…</p>
  if (!(progress.data?.unlocked_part_ids.includes(partId) || saved)) return <div className="p-8 text-center"><Link to={MAP}>先完成上一 Part</Link></div>
  return <div className="mx-auto max-w-3xl space-y-7 px-4 py-8" data-testid={`jtw-${partId}`}><header><p className="text-xs font-bold text-brand-sky">西游记 · 第六章 · Part {partId.at(-1)}</p><h1 className="text-3xl font-black">{partId.endsWith('p1') ? '六枚印走到天宫' : '感受与选择不是一件事'}</h1></header>{partId.endsWith('p1') ? <><p>悟空带着名字、本领和金箍棒来到云门，期待有人认真看见他的能力；被邀请却不等于安排已经合适。</p><OrderCards title="按故事顺序排列六枚印" options={SEAL_CARDS} order={cards} onChange={setCards} done={cards.join('|') === SEALS.join('|')} testId="jtw-c6p1-seals" /><EvidenceGroup title="找出期待与实际安排" options={FOUR.slice(0, 2)} selected={evidence} onToggle={(id) => setEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} done={evidence.length === 2} testId="jtw-c6p1-evidence" /><Choice option={{ id: 'expectation-gap', label: '重要合适工作的期待，与照看天马的安排形成差距', correct: true }} active={prediction === 'expectation-gap'} onPick={() => setPrediction('expectation-gap')} /></> : <><p>悟空难过的是安排没有解释清楚。感受可以理解，但询问、等待、商量或立刻离开会带来不同结果。</p><EvidenceGroup title="分别标记愿望、安排、感受、选择" options={FOUR} selected={evidence} onToggle={(id) => setEvidence((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])} done={FOUR.every((item) => evidence.includes(item.id))} testId="jtw-c6p2-four" /><Choice option={{ id: 'leaving-does-not-solve', label: '离开能表达不满，但不会自动解决分歧', correct: true }} active={prediction === 'leaving-does-not-solve'} onPick={() => setPrediction('leaving-does-not-solve')} /></>}{(done || saved) && <section data-testid="jtw-c6-resolved" className="rounded-2xl bg-wash-mint p-5">{partId.endsWith('p1') ? '六枚印连成路，天宫名牌亮起。' : '离开云显现；响亮称号没有自动修好分歧。'}</section>}<button data-testid="jtw-c6-complete" className="btn-pill-primary w-full" disabled={(!done && !saved) || complete.isPending} onClick={() => complete.mutate()}>继续故事</button></div>
}
