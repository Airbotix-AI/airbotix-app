import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useMe } from '@/auth/useAuth';
import { createBlocksProject, loadBlocksProject } from '../blocksApi';
import { jtwC4P7Version, type JtwC4P5Version } from '../jtwC4DualBuild';
import { findC4PersonalShipBuild } from './journeyWestC4PersonalShip';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import { Choice } from './partUi';
import { completeStoryPart, fetchStoryLineProgress } from './storyPartsApi';

const PART_ID = 'jtw-s1-c4-p7';
const NEXT_PART_ID = 'jtw-s1-c4-p8';
const VERSIONS: Array<{
  id: JtwC4P5Version;
  label: string;
  template: `blocks_jtw_c4_p7_${JtwC4P5Version}`;
}> = [
  { id: 'hop', label: 'Jump over the leaf pattern', template: 'blocks_jtw_c4_p7_hop' },
  { id: 'turn', label: 'Turn around and point home', template: 'blocks_jtw_c4_p7_turn' },
  { id: 'reappear', label: 'Screen reproduction', template: 'blocks_jtw_c4_p7_reappear' },
];

export function JourneyWestC4Part7Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c4-p7-build', kidId],
    queryFn: () => findC4PersonalShipBuild(kidId!),
    enabled: Boolean(kidId),
  });
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
    setReopenConsistent(
      JSON.stringify(reopened.project) === build.data.snapshot &&
        jtwC4P7Version(reopened.project) === version,
    );
  };
  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        prediction: prediction ?? undefined,
        selections: {
          story_screens: ['story-screen-7'],
          skill_version: version ? [version] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
          runner_result: ['flag:name-only:end', 'tap:chosen-skill:end', 'reopen:flag-and-tap:end'],
          peer_discovery: peerDiscovery ? [peerDiscovery] : [],
          discoverability_hint: ['gentle-finger-target'],
          saved_version: build.data ? [String(build.data.savedVersion)] : [],
          reopen_json_match: reopenConsistent ? ['true'] : [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });
  if (progress.isLoading)
    return <p className="p-8 text-center">Opening the display card workbench...</p>;
  if (!(progress.data?.unlocked_part_ids.includes(PART_ID) || saved))
    return (
      <div className="p-8 text-center" data-testid="jtw-c4p7-locked">
        <Link to="/learn/story/journey-west">Complete Trigger troubleshooting first</Link>
      </div>
    );
  const openStudio = async () => {
    if (build.data?.projectId) return navigate(`/learn/blocks/${build.data.projectId}`);
    if (!selected) return;
    const project = await createBlocksProject({
      title: 'Meet Sun Wukong',
      template: selected.template,
    });
    navigate(`/learn/blocks/${project.id}`);
  };
  const ready =
    prediction === 'flag-name-tap-skill' &&
    peerDiscovery === 'found-wukong-by-gentle-cue' &&
    built &&
    reopenConsistent;
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c4-p7">
      <header>
        <p className="text-xs font-bold text-brand-sky">Journey to the West · Chapter 4 · Part 7</p>
        <h1 className="text-3xl font-black">Let your companions truly know Wukong</h1>
      </header>
      <section className="space-y-3 rounded-2xl border p-5" data-testid="jtw-c4p7-story">
        <p>
          Wukong has learned to let the name stand first and let the small presentation wait for the
          invitation. Now please make a "Meet Sun Wukong" recognition card that truly belongs to
          you.
        </p>
        <p>
          The stone monkey who came from Flower-Fruit Mountain did not disappear, and he was also
          called Sun Wukong from then on. The gentle fingertip aim will help the companion discover
          that he can be clicked, but it will not say "Click here to win a prize" or let the skill
          play automatically.
        </p>
      </section>
      <section>
        <h2 className="font-bold">Predict two entrances first</h2>
        <Choice
          option={{
            id: 'flag-name-tap-skill',
            label: 'Go only gets its name, and Tap shows it',
            correct: true,
          }}
          active={prediction === 'flag-name-tap-skill'}
          onPick={() => setPrediction('flag-name-tap-skill')}
        />
        <Choice
          option={{ id: 'all-on-go', label: 'Go automatically plays all', correct: false }}
          active={prediction === 'all-on-go'}
          onPick={() => setPrediction('all-on-go')}
        />
      </section>
      <section className="space-y-2">
        <h2 className="font-bold">Choose action, sequence, rhythm and short dialogue</h2>
        {VERSIONS.map((item) => (
          <button
            key={item.id}
            className={`w-full rounded-xl border p-3 text-left ${version === item.id ? 'border-brand-sky bg-wash-sky' : ''}`}
            onClick={() => {
              setVersion(item.id);
              setReopenConsistent(false);
            }}
          >
            <strong>{item.label}</strong>
            <span className="block text-sm">
              Start with two empty Triggers and complete the name chain and skill chain by yourself.
            </span>
          </button>
        ))}
      </section>
      <section className="rounded-2xl bg-wash-sky p-5">
        <button
          className="btn-pill-primary"
          disabled={!selected || prediction !== 'flag-name-tap-skill'}
          onClick={() => void openStudio()}
        >
          {build.data?.projectId ? 'Return to personal works' : 'Open an empty Trigger workspace'}
        </button>
        <p data-testid="jtw-c4p7-build-status">
          {built
            ? '✓ At least seven pieces of content including End, Go wait and real Tap have been written to VFS'
            : 'Waiting for two real block chains and double events to run'}
        </p>
      </section>
      {built && (
        <section>
          <h2 className="font-bold">
            The partner didn’t listen to the verbal answer, what happened?
          </h2>
          <Choice
            option={{
              id: 'found-wukong-by-gentle-cue',
              label:
                'Look at the name first, then find out Wukong can be clicked from the slight fingertip target',
              correct: true,
            }}
            active={peerDiscovery === 'found-wukong-by-gentle-cue'}
            onPick={() => setPeerDiscovery('found-wukong-by-gentle-cue')}
          />
          <Choice
            option={{
              id: 'needed-answer',
              label: 'You have to tell him directly where to order.',
              correct: false,
            }}
            active={peerDiscovery === 'needed-answer'}
            onPick={() => setPeerDiscovery('needed-answer')}
          />
          <button
            className="btn-pill-primary mt-3"
            data-testid="jtw-c4p7-reopen"
            disabled={peerDiscovery !== 'found-wukong-by-gentle-cue'}
            onClick={() => void verifyReopen()}
          >
            Close and reopen and check JSON
          </button>
          <p data-testid="jtw-c4p7-reopen-status">
            {reopenConsistent
              ? '✓ The two scripts, characters, backgrounds, names and action selections are consistent; they can be run again'
              : 'The reopened version has not been checked yet'}
          </p>
        </section>
      )}
      {ready && (
        <section className="rounded-2xl bg-wash-mint p-5" data-testid="jtw-c4p7-resolved">
          <h2 className="font-black">
            Personal recognition cards retain the name tag and selected target.
          </h2>
          <p>
            Wukong is still the stone monkey who traveled far from Flower-Fruit Mountain. Finally,
            let’s talk about the causes and effects of traveling far, getting a name, studying, and
            waiting for an invitation.
          </p>
        </section>
      )}
      <button
        className="btn-pill-primary w-full"
        data-testid="jtw-c4p7-continue"
        disabled={!ready || complete.isPending}
        onClick={() => complete.mutate()}
      >
        {saved ? 'Return to map' : 'Tell me this story'}
      </button>
      <p className="text-center text-xs">
        This Part only unlocks P8 and does not complete Chapter 4.
      </p>
    </div>
  );
}
