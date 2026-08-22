const ASSET_ROOT = '/story-blocks/journey-to-the-west'

interface SceneActor {
  alt: string
  asset: string
  left: number
  width: number
}

interface SceneProp {
  alt: string
  asset: string
  left: number
  width: number
}

export interface JourneyWestS2SceneModel {
  background: string
  actors: SceneActor[]
  props: SceneProp[]
  chapter: number
  part: number
  resolved: boolean
}

const character = (name: string, pose: string) => `${ASSET_ROOT}/characters/${name}/${pose}-v01.png`
const prop = (name: string) => `${ASSET_ROOT}/props/${name}/neutral-v01.png`

function parsePartId(partId: string): { chapter: number; part: number } {
  const match = /^jtw-s2-c([1-6])-p([1-8])$/.exec(partId)
  if (!match) throw new Error(`Unsupported Journey West S2 part: ${partId}`)
  return { chapter: Number(match[1]), part: Number(match[2]) }
}

function backgroundFor(chapter: number, part: number, resolved: boolean): string {
  const state = resolved ? 'resolved' : 'before'
  if (chapter < 6) return `${ASSET_ROOT}/backgrounds/s2/c${chapter}/${state}-v01.webp`
  const page = part === 6 ? 2 : part >= 5 ? 3 : 1
  const version = page === 1 ? 'v02' : 'v01'
  return `${ASSET_ROOT}/backgrounds/s2/c6/page${page}-${state}-${version}.webp`
}

function actorsFor(chapter: number, part: number, resolved: boolean): SceneActor[] {
  if (chapter === 1) {
    const pose = part <= 3 ? 'read' : part === 8 ? 'retell' : resolved ? 'choose' : 'neutral'
    return [{ alt: '玄奘', asset: character('xuanzang', pose), left: 39, width: 22 }]
  }
  if (chapter === 2) {
    const wukongPose = part <= 3 ? 'think' : part === 5 ? 'tap' : resolved ? 'celebrate' : 'point'
    return [
      { alt: '玄奘', asset: character('xuanzang', part === 8 ? 'retell' : 'choose'), left: 19, width: 20 },
      { alt: '孙悟空', asset: character('wukong-traveller', wukongPose), left: 61, width: 20 },
    ]
  }
  if (chapter === 3) {
    return [
      { alt: '孙悟空', asset: character('wukong-traveller', resolved ? 'help' : 'point'), left: 18, width: 20 },
      { alt: '白龙马', asset: character('white-dragon-horse', resolved ? 'bow' : 'bump-surprise'), left: 61, width: 24 },
    ]
  }
  if (chapter === 4) {
    return [
      { alt: '孙悟空', asset: character('wukong-traveller', 'point'), left: 12, width: 18 },
      { alt: '猪八戒', asset: character('bajie', resolved ? 'send' : 'think'), left: 42, width: 20 },
      { alt: '白龙马', asset: character('white-dragon-horse', resolved ? 'bow' : 'neutral'), left: 69, width: 22 },
    ]
  }
  if (chapter === 5) {
    return [
      { alt: '孙悟空', asset: character('wukong-traveller', 'point'), left: 8, width: 18 },
      { alt: '猪八戒', asset: character('bajie', resolved ? 'send' : 'carry'), left: 39, width: 20 },
      { alt: '沙悟净', asset: character('wujing', resolved ? 'receive' : 'carry'), left: 69, width: 20 },
    ]
  }
  return [
    { alt: '玄奘', asset: character('xuanzang', part === 8 ? 'retell' : 'choose'), left: 4, width: 16 },
    { alt: '孙悟空', asset: character('wukong-traveller', resolved ? 'celebrate' : 'help'), left: 22, width: 16 },
    { alt: '白龙马', asset: character('white-dragon-horse', resolved ? 'bow' : 'walk'), left: 41, width: 18 },
    { alt: '猪八戒', asset: character('bajie', resolved ? 'help' : 'carry'), left: 60, width: 17 },
    { alt: '沙悟净', asset: character('wujing', resolved ? 'celebrate' : 'bridge'), left: 79, width: 17 },
  ]
}

function propsFor(chapter: number, part: number, resolved: boolean): SceneProp[] {
  if (chapter === 1) {
    const name = part <= 3 ? 'map-scroll' : part <= 6 ? 'route-marker' : 'travel-bag'
    return [{ alt: name === 'map-scroll' ? '空白路线卷轴' : name === 'route-marker' ? '路线标记' : '旅行行囊', asset: prop(name), left: 70, width: 12 }]
  }
  if (chapter === 2) return [{ alt: '路线标记', asset: prop('route-marker'), left: 47, width: 10 }]
  if (chapter === 3) return [{ alt: '水纹石', asset: prop('water-ripple-stone'), left: 45, width: 12 }]
  if (chapter === 4) {
    const name = part >= 5 || resolved ? 'message-gold' : 'message-blue'
    return [{ alt: name === 'message-blue' ? '蓝色消息卡' : '金色消息卡', asset: prop(name), left: 47, width: 10 }]
  }
  if (chapter === 5) {
    const names = ['message-blue', 'message-gold', 'message-purple']
    const name = names[(Math.max(part, 1) - 1) % names.length]
    return [{ alt: '接力消息卡', asset: prop(name), left: 48, width: 10 }]
  }
  const name = part >= 5 ? 'team-flag' : 'safe-stepping-stone'
  return [{ alt: name === 'team-flag' ? '队伍旗帜' : '安全踏脚石', asset: prop(name), left: 47, width: 11 }]
}

export function getJourneyWestS2SceneModel(partId: string, resolved: boolean): JourneyWestS2SceneModel {
  const { chapter, part } = parsePartId(partId)
  return {
    background: backgroundFor(chapter, part, resolved),
    actors: actorsFor(chapter, part, resolved),
    props: propsFor(chapter, part, resolved),
    chapter,
    part,
    resolved,
  }
}
