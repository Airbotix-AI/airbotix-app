import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { BlocksRunner } from '../interpreter';
import type { BlockOp, BlocksProject } from '../blocksModel';
import {
  JTW_C4_NAME_TARGET,
  JTW_C4_P5_SKILL_TARGETS,
  JTW_C4_P6_PAGE_ID,
  JTW_C4_WUKONG_ASSET,
  JTW_C4_WUKONG_ID,
  jtwC4P6Version,
  type JtwC4P5Version,
} from '../jtwC4DualBuild';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { Choice } from './partUi';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';

const PART_ID = 'jtw-s1-c4-p6';
const NEXT_PART_ID = 'jtw-s1-c4-p7';
const VERSION_LABELS: Record<JtwC4P5Version, string> = {
  hop: '跃过叶纹',
  turn: '转身指家',
  reappear: '屏风再现',
};

function bugProject(version: JtwC4P5Version): BlocksProject {
  return { version: 1, name: '本领排错队', lessonId: PART_ID, pages: [{ id: JTW_C4_P6_PAGE_ID, background: 'jtw-s1-c4-mountain-gate', characters: [{ id: JTW_C4_WUKONG_ID, name: '孙悟空', emoji: '🐒', asset: JTW_C4_WUKONG_ASSET, start: { gx: 10, gy: 9, size: 3, rot: 0 }, scripts: [{ id: 'sun-wukong-name', blocks: [...JTW_C4_NAME_TARGET] }, { id: 'sun-wukong-skill', blocks: JTW_C4_P5_SKILL_TARGETS[version].map((block, index) => index === 0 ? { op: 'when_flag' as const } : { ...block }) }] }] }] };
}

async function findBuild(kidId: string) {
  for (const project of (await listBlocksProjects(kidId)).slice(0, 10)) {
    try {
      const loaded = await loadBlocksProject(project.id);
      const version = jtwC4P6Version(loaded.project);
      if (version) return { projectId: project.id, version, completed: Object.keys(loaded.storyProgress?.completed ?? {}).includes(PART_ID) };
    } catch { /* Ignore unreadable legacy work. */ }
  }
  return null;
}

export function JourneyWestC4Part6Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID], queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID) });
  const build = useQuery({ queryKey: ['jtw-c4-p6-build', kidId], queryFn: () => findBuild(kidId!), enabled: Boolean(kidId) });
  const p5 = progress.data?.completed.find((entry) => entry.part_id === 'jtw-s1-c4-p5');
  const selectedVersion = ((p5?.evidence as StoryPartEvidence | undefined)?.selections?.version?.[0] ?? null) as JtwC4P5Version | null;
  const saved = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const [expectation, setExpectation] = useState<string | null>(null);
  const [bugTrace, setBugTrace] = useState<BlockOp[]>([]);
  const [firstBreak, setFirstBreak] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const traceRef = useRef<BlockOp[]>([]);
  if (saved && !restored) {
    const evidence = saved.evidence as StoryPartEvidence;
    setExpectation(evidence.prediction ?? null);
    setBugTrace((evidence.selections?.bug_trace ?? []) as BlockOp[]);
    setFirstBreak(evidence.selections?.first_break?.[0] ?? null);
    setRestored(true);
  }
  const runBug = async () => {
    if (!selectedVersion) return;
    traceRef.current = ['when_flag'];
    const project = bugProject(selectedVersion);
    const page = project.pages[0];
    const runner = new BlocksRunner(page, { onSprite: () => undefined, onSay: () => undefined, onNote: () => undefined, onSound: () => undefined, onGotoPage: () => undefined, onStep: (_id, scriptId, index) => { if (index < 0) return; const op = page.characters[0].scripts.find((script) => script.id === scriptId)?.blocks[index]?.op; if (op) traceRef.current.push(op); } }, async () => undefined);
    runner.resetAll();
    await runner.runFlag();
    setBugTrace(traceRef.current);
  };
  const repaired = Boolean(build.data?.completed && build.data.version === selectedVersion);
  const complete = useMutation({ mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, { schema_version: 1, prediction: expectation ?? undefined, selections: { story_screens: ['story-screen-6'], bug_trace: bugTrace, first_break: firstBreak ? [firstBreak] : [], trigger_diff: ['when_flag->when_tap'], skill_version: selectedVersion ? [selectedVersion] : [], build_project: build.data?.projectId ? [build.data.projectId] : [], runner_result: ['flag:name-only:end', 'tap:chosen-skill:end'] } }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] }); navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } }); } });
  if (progress.isLoading) return <p className="p-8 text-center">正在整理两条事件轨迹…</p>;
  if (!(progress.data?.unlocked_part_ids.includes(PART_ID) || saved)) return <div className="p-8 text-center" data-testid="jtw-c4p6-locked"><Link to="/learn/story/journey-west">先完成本领选择</Link></div>;
  const readyToFix = expectation === 'flag-name-tap-skill' && bugTrace.length > 4 && firstBreak === 'skill-used-when-flag';
  const openStudio = async () => {
    if (build.data?.projectId) return navigate(`/learn/blocks/${build.data.projectId}`);
    if (!selectedVersion) return;
    const project = await createBlocksProject({ title: `西游记 · 修好${VERSION_LABELS[selectedVersion]}`, template: `blocks_jtw_c4_p6_${selectedVersion}` });
    navigate(`/learn/blocks/${project.id}`);
  };
  return <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p6">
    <header><p className="text-xs font-bold text-brand-sky">西游记 · 第四章 · Part 6</p><h1 className="text-3xl font-black">先找第一次偏离</h1></header>
    <section className="space-y-3 rounded-2xl border p-5" data-testid="jtw-c4p6-story"><p>一阵风把悟空刚才选好的整段本领链吹到了错误入口。动作、参数和顺序都没有变，可是Go一按，名字刚出现，本领就抢先演了起来。</p><p>悟空说：“我想先用名字与大家相识，再等师父和伙伴邀请。请不要删掉我的动作，帮我找出它们在等错了什么。”</p></section>
    <section><h2 className="font-bold">先说预期</h2><Choice option={{ id: 'flag-name-tap-skill', label: 'Go只得名，Tap才展示', correct: true }} active={expectation === 'flag-name-tap-skill'} onPick={() => setExpectation('flag-name-tap-skill')} /><Choice option={{ id: 'all-on-go', label: 'Go后全部自动播放', correct: false }} active={expectation === 'all-on-go'} onPick={() => setExpectation('all-on-go')} /></section>
    <button className="btn-pill-primary" data-testid="jtw-c4p6-run-bug" disabled={expectation !== 'flag-name-tap-skill' || !selectedVersion} onClick={() => void runBug()}>运行错误版</button>
    <p data-testid="jtw-c4p6-bug-trace">错误轨迹：{bugTrace.join(' → ') || '尚未运行'}</p>
    {bugTrace.length > 4 && <section><h2 className="font-bold">第一次偏离在哪里？</h2><Choice option={{ id: 'skill-used-when-flag', label: '本领链使用了when_flag', correct: true }} active={firstBreak === 'skill-used-when-flag'} onPick={() => setFirstBreak('skill-used-when-flag')} /><Choice option={{ id: 'hop-number', label: '动作参数太小', correct: false }} active={firstBreak === 'hop-number'} onPick={() => setFirstBreak('hop-number')} /></section>}
    <section className="rounded-2xl bg-wash-sky p-5"><button className="btn-pill-primary" data-testid="jtw-c4p6-open-studio" disabled={!readyToFix} onClick={() => void openStudio()}>{build.data?.projectId ? '回到排错工作区' : '打开排错工作区'}</button><p data-testid="jtw-c4p6-build-status">{repaired ? '✓ 只改变Trigger归属；Go等待与真实Tap都已保存' : '把完整动作组逐块重接到Tap，再做双测试'}</p></section>
    {repaired && <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c4p6-resolved"><h2 className="font-black">小旗与指尖重新成为两条独立的路。</h2><p>悟空先用名字与大家相识，再等邀请完整展示。得名印亮起，但第四章还没有完成。</p><p>下一步制作可保存、可供同伴发现的个人认识卡。</p></section>}
    <button className="btn-pill-primary w-full" data-testid="jtw-c4p6-continue" disabled={!readyToFix || !repaired || complete.isPending} onClick={() => complete.mutate()}>{saved ? '回到地图' : '制作我的认识卡'}</button>
  </div>;
}
