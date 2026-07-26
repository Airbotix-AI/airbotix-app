// Journey to the West · C2-P7 "把发现变成大家的路" — chapter two's Personal Ship
// contract and child-facing content (scene-specs JTW-S1-C2-P7, teaching script
// C2 Part 7).
//
// The child designs the entry route themselves: which bank, the exact chain
// that bank needs, how long the door stays open and which evidence line the
// cave says. `jtwPersonalEntry.ts` owns the design grammar; this module owns
// the Part's story text, its evidence questions, and the read-back that turns a
// SAVED BlocksProject into the Part's completion evidence.
//
// Split out of the page so neither file approaches the 1000-line hard rule in
// rules/file-organization.md.

import type { BlocksProject, Page } from '../blocksModel';
import { listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  JTW_C2_P7_LESSON_ID,
  JTW_C2_P7_PAGE_ID,
  jtwPersonalEntryDesign,
  type JtwPersonalEntryDesign,
} from '../jtwPersonalEntry';
import type { JtwEvidenceOption } from './journeyWestSeason1';

export const C2_P7_LESSON_ID = JTW_C2_P7_LESSON_ID;
export const C2_P7_TEMPLATE = 'blocks_jtw_c2_p7' as const;
/** Teaching script C2 Part 7 names the saved work `Find the Water Curtain Cave`. */
export const C2_P7_PROJECT_TITLE = '西游记 · Find the Water Curtain Cave';

/** Child-facing story text — teaching script C2 Part 7 IN FULL, never compressed. */
export const C2_P7_STORY_BEFORE: readonly [string, string, string] = [
  '石猴回到伙伴面前，说明了洞里安全，并邀请大家跟着他的路线进入。可是“我走过一次”不等于“大家都能走”：伙伴要的是一条看得懂、猜得到、每次都一样的路。',
  '这一次由你来设计：选择左路或右路，自主搭建石猴的主脚本；可以决定几段方向和距离、等待多久，以及洞口说出哪一句发现，但必须保持“到达→碰到→水帘回应”的故事锁。水帘和洞口的回应轨一块都不能删。',
  'Ship Checkpoint 3：同伴只看地图和程序先预测路线与洞口回应，实际运行一致；保存、关闭、重开以后再跑一次，结果还要一样。作品名：Find the Water Curtain Cave。',
];

/** 人物动机：把个人发现变成伙伴可预测、可重复的安全路线。 */
export const C2_P7_MOTIVE =
  '石猴不是要再表演一次自己的本事，而是要把个人的发现变成大家的路：伙伴照着这条路线走，能预测每一个停点，也能一次又一次安全地进出。';

/** 因果桥：路线产生接触，接触启动回应，等待把门留给伙伴。 */
export const C2_P7_STORY_BRIDGE =
  '路线的最后一步让脚底刚好碰到水帘，碰撞启动水帘的 Hide 和洞口的 Show，最后那块 Wait 把门留着——等待必须发生在伙伴进来之前，否则程序刚回应完就结束了。';

/** 预测（scene-specs）：同伴只看起点和积木，先说路线会停在哪里。 */
export const C2_P7_PREDICTION_QUESTION =
  '让同伴只看起点和这串积木，先预测：石猴最后停在哪里，会发生什么？';
export const C2_P7_PREDICTION_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'predict-knock-then-open',
    label: '停在离水帘只有一格的那块石头上——脚一碰到，水帘就 Hide，洞口就 Show',
    correct: true,
  },
  {
    id: 'predict-walk-through',
    label: '直接走进洞里，不需要碰到水帘',
    correct: false,
  },
  {
    id: 'predict-two-cells-away',
    label: '停在离水帘两格的地方，水帘也会分开',
    correct: false,
  },
];
export const C2_P7_PREDICTION_RETRY_HINT =
  '想想 Part 4 学到的：少一格就碰不到，水帘不会有任何回应。路线必须刚好走到离水帘一格的那块石头上。';

/** 证据：Wait 为什么放在碰撞之后。 */
export const C2_P7_WAIT_QUESTION = '你把 Wait 放在最后。为什么它不能放在移动之前？';
export const C2_P7_WAIT_OPTIONS: JtwEvidenceOption[] = [
  {
    id: 'wait-holds-door',
    label: '因为要先碰到水帘、洞口先出现，等待才是“把门留给伙伴”',
    correct: true,
  },
  { id: 'wait-makes-faster', label: '因为等一等石猴会走得更快', correct: false },
  { id: 'wait-anywhere', label: '放在哪里都一样，Wait 不影响故事', correct: false },
];
export const C2_P7_WAIT_RETRY_HINT =
  '按顺序读一遍：走到→碰到→水帘隐藏→洞口出现→等。如果先等，门还没开，伙伴根本没有可以进的地方。';

export const C2_P7_RESOLVED_WORLD_CHANGE =
  '群猴按你设计的路线一个接一个走过来：脚印落在同样的石头上，水帘在同一格分开，洞里的石座和清水成了大家的休息位。';
export const C2_P7_STORY_AFTER =
  '洞里从安静的空地变成有伙伴、有回应的新家。发现成了共同的家园——故事还差最后一步：他们要怎样兑现瀑布前的约定？';
export const C2_P7_CONTINUE_LABEL = '看看约定完成了吗';

/** What the part page reads back from the kid's SAVED Personal Ship project. */
export interface C2P7EntryBuild {
  projectId: string | null;
  /** Server VFS version of the saved project — the version id the evidence cites. */
  savedVersion: number | null;
  /** The parsed design, or null when the saved page breaks the contract. */
  design: JtwPersonalEntryDesign | null;
  /** The studio recorded a real verified run + save for this lesson. */
  runCompleted: boolean;
  /** The saved page itself, so the part page can REOPEN and rerun it for real. */
  page: Page | null;
}

export const C2_P7_EMPTY_BUILD: C2P7EntryBuild = {
  projectId: null,
  savedVersion: null,
  design: null,
  runCompleted: false,
  page: null,
};

/** Turn a freshly loaded project + VFS version into the Part's build status. */
export function c2p7BuildFrom(
  projectId: string,
  project: BlocksProject,
  version: number,
  runCompleted: boolean,
): C2P7EntryBuild {
  const page = project.pages.find((candidate) => candidate.id === JTW_C2_P7_PAGE_ID) ?? null;
  return {
    projectId,
    savedVersion: version,
    design: project.lessonId === C2_P7_LESSON_ID ? jtwPersonalEntryDesign(page ?? undefined) : null,
    runCompleted,
    page,
  };
}

/** How far back through the kid's recent work the entry project is searched. */
const RECENT_PROJECTS_TO_SCAN = 8;

/**
 * Reopen the kid's SAVED Personal Ship straight from the server. Both C2-P7 and
 * C2-P8 start from this load — for P7 it IS the "关闭重开", and for P8 it is the
 * scene's "加载P7真实保存版本" (never an answer project this page built).
 */
export async function findC2EntryBuild(kidId: string): Promise<C2P7EntryBuild> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== C2_P7_LESSON_ID) continue;
      return c2p7BuildFrom(
        meta.id,
        loaded.project,
        loaded.version,
        Boolean(loaded.storyProgress?.completed[C2_P7_LESSON_ID]) &&
          storyMissionProgramMatches(loaded.project, C2_P7_LESSON_ID),
      );
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return C2_P7_EMPTY_BUILD;
}
