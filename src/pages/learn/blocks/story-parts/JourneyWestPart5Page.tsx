// Journey to the West · C1-P5 "两种真诚的问候" — Build 2, the greeting-order
// choice (scene-specs JTW-S1-C1-P5). Both orders are valid. The child builds
// in the REAL Studio (template blocks_jtw_c1_p5: the verified prefix ships;
// Hop 1 + a preset Say land in the child's chosen order), runs both versions
// there, keeps one — and this page reads the SAVED BlocksProject to detect
// which version they kept. The story sentence evidence must match the
// detected version and the monkeys' response follows it. Continue unlocks
// ONLY jtw-s1-c1-p6.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { createBlocksProject, listBlocksProjects, loadBlocksProject } from '../blocksApi';
import { storyMissionProgramMatches } from '../storyMissionProgress';
import {
  C1_P5_COMPARE_OPTIONS,
  C1_P5_CONTINUE_LABEL,
  C1_P5_MOTIVE_OPTIONS,
  C1_P5_RESOLVED_HOP_FIRST,
  C1_P5_RESOLVED_SAY_FIRST,
  C1_P5_SENTENCE_HOP_FIRST,
  C1_P5_SENTENCE_SAY_FIRST,
  C1_P5_STORY_AFTER,
  C1_P5_STORY_BEFORE,
  JTW_S1_STORY_LINE_ID,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice } from './partUi';

const PART_ID = 'jtw-s1-c1-p5';
const NEXT_PART_ID = 'jtw-s1-c1-p6';
const LESSON_ID = 'jtw-s1-c1-p5';
const RECENT_PROJECTS_TO_SCAN = 8;
const PROJECT_TITLE = 'Journey to the West · My First Greeting';

type GreetingVersion = 'hop-first' | 'say-first';

interface GreetingBuildStatus {
  projectId: string | null;
  valid: boolean;
  runCompleted: boolean;
  version: GreetingVersion | null;
  greeting: string | null;
}

/** Read the kid's REAL saved greeting build and detect which order they kept. */
async function findGreetingBuild(kidId: string): Promise<GreetingBuildStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== LESSON_ID) continue;
      const blocks =
        loaded.project.pages[0]?.characters
          .find((character) => character.id === 'stone-monkey')
          ?.scripts.find((script) => script.id === 'stone-monkey-first-greeting')?.blocks ?? [];
      const fifth = blocks[4];
      const version: GreetingVersion | null =
        fifth?.op === 'hop' ? 'hop-first' : fifth?.op === 'say' ? 'say-first' : null;
      const greeting = blocks.find((block) => block.op === 'say')?.text ?? null;
      return {
        projectId: meta.id,
        valid: storyMissionProgramMatches(loaded.project, LESSON_ID),
        runCompleted: Boolean(loaded.storyProgress?.completed[LESSON_ID]),
        version,
        greeting,
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return { projectId: null, valid: false, runCompleted: false, version: null, greeting: null };
}

export function JourneyWestPart5Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const build = useQuery({
    queryKey: ['jtw-c1-p5-build', kidId],
    queryFn: () => findGreetingBuild(kidId!),
    enabled: !!kidId,
  });

  const [motive, setMotive] = useState<string | null>(null);
  const [sentence, setSentence] = useState<string | null>(null);
  const [compared, setCompared] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setMotive(evidence.selections?.motive?.[0] ?? null);
    setSentence(evidence.selections?.sentence?.[0] ?? null);
    setCompared(evidence.selections?.compared_both?.[0] ?? null);
    setRestored(true);
  }

  const buildDone = Boolean(build.data?.valid && build.data.runCompleted);
  const version = build.data?.version ?? null;
  const sentenceOptions =
    version === 'say-first' ? C1_P5_SENTENCE_SAY_FIRST : C1_P5_SENTENCE_HOP_FIRST;
  const motiveDone = C1_P5_MOTIVE_OPTIONS.find((o) => o.id === motive)?.correct === true;
  const sentenceDone = sentenceOptions.find((o) => o.id === sentence)?.correct === true;
  const comparedDone = C1_P5_COMPARE_OPTIONS.find((o) => o.id === compared)?.correct === true;
  const completed = Boolean(savedEntry);
  const resolved = motiveDone && sentenceDone && comparedDone && buildDone;

  const openStudio = async () => {
    if (build.data?.projectId) {
      navigate(`/learn/blocks/${build.data.projectId}`);
      return;
    }
    try {
      const { id } = await createBlocksProject({
        title: PROJECT_TITLE,
        template: 'blocks_jtw_c1_p5',
      });
      navigate(`/learn/blocks/${id}`);
    } catch {
      // The button stays; the kid can tap again.
    }
  };

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          motive: motive ? [motive] : [],
          sentence: sentence ? [sentence] : [],
          compared_both: compared ? [compared] : [],
          kept_version: version ? [version] : [],
          greeting: build.data?.greeting ? [build.data.greeting] : [],
          build_project: build.data?.projectId ? [build.data.projectId] : [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">Two versions are being prepared…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-p5-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          First create the birth chain in Part 4, and then choose the greeting method.
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          Back to story map
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c1-p5">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          Journey to the West · Chapter 1 The Stone Monkey is Born · Part 5 · Build 2
        </p>
        <h1 className="text-[28px] font-black text-ink">Two sincere greetings</h1>
      </header>

      <section data-testid="jtw-p5-story">
        <p className="text-[16px] leading-8 text-ink">{C1_P5_STORY_BEFORE}</p>
      </section>

      {/* ── 动机 ────────────────────────────────────────────────────── */}
      <section data-testid="jtw-p5-motive">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          What is Stone Monkey choosing this time?
        </h2>
        <div className="flex flex-col gap-2">
          {C1_P5_MOTIVE_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={motive === option.id}
              onPick={() => setMotive(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 真实搭建 + 双版本比较 ───────────────────────────────────── */}
      <section
        className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
        data-testid="jtw-p5-build"
        data-build-state={buildDone ? 'done' : build.data?.projectId ? 'in_progress' : 'none'}
        data-kept-version={version ?? 'none'}
      >
        <h2 className="text-[15px] font-bold text-ink">
          Go to the workspace to create your greeting and run it in both orders.
        </h2>
        <p className="mt-1 text-[13px] text-ink-soft">
          Start, hide, Chime, Show have been placed. Connect Hop 1 and a preset greeting in the
          order you choose; run one version first, Swap the order and run another version, leaving
          the version you want at the end and save it. Both orders are correct - but Show cannot be
          deleted, Nor can greetings precede appearances.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-p5-open-studio"
            onClick={() => void openStudio()}
          >
            {buildDone
              ? 'Look at my version again'
              : build.data?.projectId
                ? 'Continue building →'
                : 'Start building →'}
          </button>
          {buildDone && version && (
            <span className="text-[13px] font-bold text-brand-mint" data-testid="jtw-p5-build-done">
              ✓ What you leave behind is
              {version === 'hop-first'
                ? '"Dance first and say hello later"'
                : '"Say hello first before jumping"'}
              version
            </span>
          )}
        </div>
      </section>

      {/* ── 比较证据 + 句子 ─────────────────────────────────────────── */}
      {buildDone && (
        <>
          <section data-testid="jtw-p5-compared">
            <h2 className="mb-2 text-[15px] font-bold text-ink">
              Have you ever run a comparison between the two sequences?
            </h2>
            <div className="flex flex-col gap-2">
              {C1_P5_COMPARE_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={compared === option.id}
                  onPick={() => setCompared(option.id)}
                />
              ))}
            </div>
            {compared === 'ran-one' && (
              <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                Go back to the workspace and run through the other sequence before choosing - only
                after comparison can the real choice be considered.
              </p>
            )}
          </section>

          <section data-testid="jtw-p5-sentence">
            <h2 className="mb-2 text-[15px] font-bold text-ink">
              Describe your saved version in a sentence:
            </h2>
            <div className="flex flex-col gap-2">
              {sentenceOptions.map((option) => (
                <Choice
                  key={option.id}
                  option={option}
                  active={sentence === option.id}
                  onPick={() => setSentence(option.id)}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── resolved（随版本变化）+ story_after + continue ──────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-p5-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">
            {version === 'say-first' ? C1_P5_RESOLVED_SAY_FIRST : C1_P5_RESOLVED_HOP_FIRST}
          </p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C1_P5_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← Back to story map
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-p5-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? 'Saving…' : C1_P5_CONTINUE_LABEL}
        </button>
      </footer>
      {complete.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          Not saved, please click again to try.
        </p>
      )}
    </div>
  );
}
