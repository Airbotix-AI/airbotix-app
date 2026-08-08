export const C4_P3_STORY = [
  '名字卡已经挂在山门旁，可是悟空还要学会分清“什么时候开始”。小旗是 Start：它等场景开始；指尖是 Tap：它等观众邀请。',
  '今天先用纸卡排练。动作卡被放错入口时，悟空会抢跑；把整张卡移到另一个入口，再分别举旗和点卡，地面上的两条轨迹才不会交叉。',
] as const

export const C4_P3_CARDS = [
  { id: 'name', label: '名字卡：我是孙悟空', correct: 'start' as const },
  { id: 'turn', label: '动作卡：转身', correct: 'tap' as const },
  { id: 'hop', label: '动作卡：Hop 一步', correct: 'tap' as const },
  { id: 'hide-show', label: '动作卡：Hide → Show', correct: 'tap' as const },
]

export const C4_P3_PREDICTIONS = [
  { id: 'cross', label: '转身会在举旗时抢跑，两条入口混在一起', correct: true },
  { id: 'quiet', label: '两条入口都会安静等待，不会出现差别', correct: false },
] as const

export const C4_P3_TRIGGER_OPTIONS = [
  { id: 'start-waits-scene', label: 'Start 等场景开始', correct: true },
  { id: 'tap-waits-invite', label: 'Tap 等观众邀请', correct: true },
] as const

export function c4p3AssignmentsDone(assignments: Record<string, string>): boolean {
  return C4_P3_CARDS.every((card) => assignments[card.id] === card.correct)
}

export function c4p3EvidenceDone(assignments: Record<string, string>): boolean {
  return assignments.turn === 'tap' && assignments.name === 'start'
}
