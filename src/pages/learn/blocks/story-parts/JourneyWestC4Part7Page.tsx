import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { jtwC4P7Version, type JtwC4P5Version } from '../jtwC4DualBuild';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { Choice } from './partUi';
import { completeStoryPart, fetchStoryLineProgress } from './storyPartsApi';

const PART_ID = 'jtw-s1-c4-p7';
const NEXT_PART_ID = 'jtw-s1-c4-p8';
const VERSIONS: Array<{ id: JtwC4P5Version; label: string; template: `blocks_jtw_c4_p7_${JtwC4P5Version}` }> = [
  { id: 'leaf', label: '跃过叶纹', template: 'blocks_jtw_c4_p7_leaf' },
  { id: 'home', label: '转身指家', template: 'blocks_jtw_c4_p7_home' },
  { id: 'screen', label: '屏风再现', template: 'blocks_jtw_c4_p7_screen' },
];

async function findBuild(kidId: string) {
  for (const meta of (await listBlocksProjects(kidId)).slice(0, 10)) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      const version = jtwC4P7Version(loaded.project);
      if (!version) continue;
      return {
        projectId: meta.id,
        version,
        snapshot: JSON.stringify(loaded.project),
        dualRunCompleted: Boolean(loaded.storyProgress?.completed?.[PART_ID]),
      };
    } catch { /* Ignore unreadable legacy projects. */ }
  }
  return null;
}

export function JourneyWestC4Part7Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID], queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID) });
  const build = useQuery({ queryKey: ['jtw-c4-p7-build', kidId], queryFn: () => findBuild(kidId!), enabled: Boolean(kidId) });
  const saved = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const [version, setVersion] = useState<JtwC4P5Version | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [peerDiscovery, setPeerDiscovery] = useState<string | null>(null);
  const [reopenConsistent, setReopenConsistent] = useState(false);
  const selected = VERSIONS.find((item) => item.id === version);
  const built = Boolean(build.data?.dualRunCompleted && build.data.version === version);
  const verifyReopen = async () => {
    if (!build.data) return;
    const reopened = await loadBlocksProject(build.data.projectId);
    setReopenConsistent(JSON.stringify(reopened.project) === build.data.snapshot && jtwC4P7Version(reopened.project) === version);
  };
  const complete = useMutation({ mutationFn: () => completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, { schema_version: 1, prediction: prediction ?? undefined, selections: { story_screens: ['story-screen-7'], skill_version: version ? [version] : [], build_project: build.data?.projectId ? [build.data.projectId] : [], runner_result: ['flag:name-only:end', 'tap:chosen-skill:end', 'reopen:flag-and-tap:end'], peer_discovery: peerDiscovery ? [peerDiscovery] : [], discoverability_hint: ['gentle-finger-target'], saved_version: build.data?.snapshot ? [build.data.snapshot] : [], reopen_json_match: reopenConsistent ? ['true'] : [] } }), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] }); navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } }); } });
  if (progress.isLoading) return <p className="p-8 text-center">正在打开展示卡工作台…</p>;
  if (!(progress.data?.unlocked_part_ids.includes(PART_ID) || saved)) return <div className="p-8 text-center" data-testid="jtw-c4p7-locked"><Link to="/learn/story/journey-west">先完成Trigger排错</Link></div>;
  const openStudio = async () => {
    if (build.data?.projectId) return navigate(`/learn/blocks/${build.data.projectId}`);
    if (!selected) return;
    const project = await createBlocksProject({ title: 'Meet Sun Wukong', template: selected.template });
    navigate(`/learn/blocks/${project.id}`);
  };
  const ready = prediction === 'flag-name-tap-skill' && peerDiscovery === 'found-wukong-by-gentle-cue' && built && reopenConsistent;
  return <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p7">
    <header><p className="text-xs font-bold text-brand-sky">西游记 · 第四章 · Part 7</p><h1 className="text-3xl font-black">让同伴真正认识悟空</h1></header>
    <section className="space-y-3 rounded-2xl border p-5" data-testid="jtw-c4p7-story"><p>悟空已经学会让名字先站稳、让小展示等到邀请。现在请做一张真正属于你的《Meet Sun Wukong》认识卡。</p><p>花果山来的石猴没有消失，他从此也叫孙悟空。轻轻的指尖目标会帮助同伴发现他可以被点，但不会写“点这里得奖”，也不会让本领自动播放。</p></section>
    <section><h2 className="font-bold">先预测两个入口</h2><Choice option={{ id: 'flag-name-tap-skill', label: 'Go只得名，Tap才展示', correct: true }} active={prediction === 'flag-name-tap-skill'} onPick={() => setPrediction('flag-name-tap-skill')} /><Choice option={{ id: 'all-on-go', label: 'Go自动播放全部', correct: false }} active={prediction === 'all-on-go'} onPick={() => setPrediction('all-on-go')} /></section>
    <section className="space-y-2"><h2 className="font-bold">选择动作、顺序、节奏和短对白</h2>{VERSIONS.map((item) => <button key={item.id} className={`w-full rounded-xl border p-3 text-left ${version === item.id ? 'border-brand-sky bg-wash-sky' : ''}`} onClick={() => { setVersion(item.id); setReopenConsistent(false); }}><strong>{item.label}</strong><span className="block text-sm">从两个空Trigger开始，亲手补齐名字链和本领链。</span></button>)}</section>
    <section className="rounded-2xl bg-wash-sky p-5"><button className="btn-pill-primary" disabled={!selected || prediction !== 'flag-name-tap-skill'} onClick={() => void openStudio()}>{build.data?.projectId ? '回到个人作品' : '打开空Trigger工作区'}</button><p data-testid="jtw-c4p7-build-status">{built ? '✓ 至少七块内容与End、Go等待和真实Tap已写入VFS' : '等待两条真实积木链与双事件运行'}</p></section>
    {built && <section><h2 className="font-bold">同伴没有听口头答案，发生了什么？</h2><Choice option={{ id: 'found-wukong-by-gentle-cue', label: '先看名字，再从轻微指尖目标发现悟空可点', correct: true }} active={peerDiscovery === 'found-wukong-by-gentle-cue'} onPick={() => setPeerDiscovery('found-wukong-by-gentle-cue')} /><Choice option={{ id: 'needed-answer', label: '必须直接告诉他点哪里', correct: false }} active={peerDiscovery === 'needed-answer'} onPick={() => setPeerDiscovery('needed-answer')} /><button className="btn-pill-primary mt-3" data-testid="jtw-c4p7-reopen" disabled={peerDiscovery !== 'found-wukong-by-gentle-cue'} onClick={() => void verifyReopen()}>关闭后重开并核对JSON</button><p data-testid="jtw-c4p7-reopen-status">{reopenConsistent ? '✓ 两条脚本、角色、背景、名字和动作选择一致；可再次运行' : '尚未核对重开版本'}</p></section>}
    {ready && <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c4p7-resolved"><h2 className="font-black">个人认识卡保留了名字牌和所选目标。</h2><p>悟空仍是从花果山远行而来的石猴。最后要讲回远行、得名、学习和等待邀请的因果。</p></section>}
    <button className="btn-pill-primary w-full" data-testid="jtw-c4p7-continue" disabled={!ready || complete.isPending} onClick={() => complete.mutate()}>{saved ? '回到地图' : '讲回这段故事'}</button><p className="text-center text-xs">本Part只解锁P8，不完成第四章。</p>
  </div>;
}
