// Journey to the West · C1-P8 "新伙伴听见了水声" — Run 后 Retell 与章节聚合
// (scene-specs JTW-S1-C1-P8). The child orders the five cause-effect cards,
// then RUNS THEIR OWN SAVED P7 work from Start to End through the REAL
// BlocksRunner on this page (no new answer project is ever created), retells
// the chapter with 因为—所以—结果—后来, and lights the C1 出世印 — which the
// SERVER aggregates from stored evidence (P1–P8 + Read/Why/Code/Run/Debug/
// Retell + the P7 saved version id). Frontend state can never light the seal.
// Continue offers 现在去看水帘 (→ jtw-s1-c2-p1) or 以后继续; the chapter never
// auto-advances into C2.

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { BlockChip } from '../BlockChip';
import { GRID_H, GRID_W } from '../blocksModel';
import type { Page } from '../blocksModel';
import { BlocksRunner, startState, type SpriteState } from '../interpreter';
import { sfx } from '../sounds';
import { listBlocksProjects, loadBlocksProject } from '../blocksApi';
import {
  C1_P8_CAUSE_CARDS,
  C1_P8_CAUSE_CARD_ORDER,
  C1_P8_CLASSIC_CARD,
  C1_P8_CONTINUE_LATER_LABEL,
  C1_P8_CONTINUE_NOW_LABEL,
  C1_P8_DIALOGUE_MONKEYS,
  C1_P8_DIALOGUE_STONE_MONKEY,
  C1_P8_LIGHT_SEAL_LABEL,
  C1_P8_MOTIVE_OPTIONS,
  C1_P8_RESOLVED_WORLD_CHANGE,
  C1_P8_RETELL_OPTIONS,
  C1_P8_RETELL_QUESTION,
  C1_P8_RETELL_RETRY_HINT,
  C1_P8_SEAL_ID,
  C1_P8_SEAL_LINE,
  C1_P8_SEAL_TITLE,
  C1_P8_STORY_AFTER,
  C1_P8_STORY_BEFORE,
  JTW_C1_BACKGROUND_ASSET,
  JTW_S1_STORY_LINE_ID,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c1-p8';
const NEXT_PART_ID = 'jtw-s1-c2-p1';
/** The saved work this part runs is the P7 Personal Ship — never a new project. */
const P7_LESSON_ID = 'jtw-s1-c1-p7';
const RECENT_PROJECTS_TO_SCAN = 8;

interface SavedWorkStatus {
  projectId: string | null;
  /** The saved VFS snapshot version of the P7 work. */
  savedVersion: number | null;
  /** The saved project's stage page — the runner executes THIS, unmodified. */
  page: Page | null;
}

/** Find the kid's REAL saved P7 personal-arrival work in the VFS. */
async function findSavedP7Work(kidId: string): Promise<SavedWorkStatus> {
  const projects = (await listBlocksProjects(kidId)).slice(0, RECENT_PROJECTS_TO_SCAN);
  for (const meta of projects) {
    try {
      const loaded = await loadBlocksProject(meta.id);
      if (loaded.project.lessonId !== P7_LESSON_ID) continue;
      return {
        projectId: meta.id,
        savedVersion: loaded.version,
        page: loaded.project.pages[0] ?? null,
      };
    } catch {
      // Unreadable/legacy project — keep scanning.
    }
  }
  return { projectId: null, savedVersion: null, page: null };
}

/** The child's SAVED P7 work executed by the REAL BlocksRunner, Start → End. */
function SavedWorkRun({
  page,
  disabled,
  onRunDone,
  sleep,
}: {
  page: Page;
  /** True until the five cause cards are ordered (contract: cards before run). */
  disabled: boolean;
  onRunDone?: () => void;
  /** Injectable for tests (mirrors BlocksRunner's injectable sleep). */
  sleep?: (ms: number) => Promise<void>;
}) {
  const character = page.characters[0];
  const blocks = character?.scripts[0]?.blocks ?? [];
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [litIndex, setLitIndex] = useState(-1);
  const [sprite, setSprite] = useState<SpriteState>(() => startState(character));
  const [say, setSay] = useState<string | null>(null);
  /** The last non-empty Say heard during the run — proof the saved greeting ran. */
  const [heard, setHeard] = useState<string | null>(null);
  const runnerRef = useRef<BlocksRunner | null>(null);

  useEffect(() => () => runnerRef.current?.stopAll(), []);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setSay(null);
    setSprite(startState(character));
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (_charId, state) => setSprite(state),
        onSay: (_charId, text) => {
          setSay(text);
          if (text) setHeard(text);
        },
        onNote: () => undefined,
        onSound: (soundId) => sfx.playSound(soundId),
        onGotoPage: () => undefined,
        onStep: (_charId, _scriptId, blockIndex) => setLitIndex(blockIndex),
      },
      sleep,
    );
    runnerRef.current = runner;
    await runner.runFlag();
    setLitIndex(-1);
    setRunning(false);
    setRan(true);
    onRunDone?.();
  }, [character, page, running, sleep, onRunDone]);

  const left = `${(sprite.gx / (GRID_W - 1)) * 100}%`;
  const top = `${(sprite.gy / (GRID_H - 1)) * 100}%`;

  return (
    <div className="space-y-4">
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
        data-testid="jtw-p8-stage"
        data-run-state={running ? 'running' : ran ? 'done' : 'idle'}
      >
        <img
          src={JTW_C1_BACKGROUND_ASSET}
          alt="花果山：你保存的亮相就要重新上演"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {character && (
          <img
            src={character.asset}
            alt="Stone Monkey"
            data-testid="jtw-p8-stone-monkey"
            data-visible={sprite.visible}
            className={clsx(
              'absolute w-[14%] -translate-x-1/2 -translate-y-full transition-all duration-200',
              !sprite.visible && 'invisible',
            )}
            style={{ left, top }}
          />
        )}
        {say && (
          <div
            data-testid="jtw-p8-say-bubble"
            className="absolute max-w-[45%] -translate-x-1/2 rounded-2xl border border-hairline bg-canvas-pure px-3 py-2 text-[13px] font-bold text-ink shadow-card-soft"
            style={{ left, top: `calc(${top} - 34%)` }}
          >
            {say}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-soft">
          这是你在 Part 7 保存的作品（只读）——从 Start 完整运行到 End，一块也不改：
        </p>
        <div className="flex flex-wrap items-center gap-1" data-testid="jtw-p8-saved-chain">
          {blocks.map((block, index) => (
            <BlockChip
              key={`${block.op}-${index}`}
              block={block}
              inChain
              isLast={index === blocks.length - 1}
              lit={index === litIndex}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="btn-pill-primary"
        disabled={running || disabled}
        onClick={() => void run()}
        data-testid="jtw-p8-run"
      >
        {running ? '运行中…' : ran ? '▶ 再运行一遍' : '▶ 从 Start 完整运行到 End'}
      </button>
      {ran && heard && (
        <p className="text-[13px] font-semibold text-ink" data-testid="jtw-p8-heard">
          运行时大家听见石猴说：「{heard}」
        </p>
      )}
      {disabled && (
        <p className="text-[13px] font-semibold text-ink-soft">先把上面的五张因果卡排好，再运行。</p>
      )}
    </div>
  );
}

export function JourneyWestPart8Page({
  previewSleep,
}: {
  /** Injectable run timing for tests. */
  previewSleep?: (ms: number) => Promise<void>;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });
  const savedWork = useQuery({
    queryKey: ['jtw-c1-p8-saved-work', kidId],
    queryFn: () => findSavedP7Work(kidId!),
    enabled: !!kidId,
  });

  const [motive, setMotive] = useState<string | null>(null);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [fullRan, setFullRan] = useState(false);
  const [retell, setRetell] = useState<string | null>(null);
  const [retellMissed, setRetellMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;
  // The seal state comes from the SERVER aggregation only — never local state.
  const seal = progress.data?.chapter_seals?.find((entry) => entry.seal_id === C1_P8_SEAL_ID);

  // A refreshed page restores the saved retell evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setMotive(evidence.selections?.motive?.[0] ?? null);
    setCardOrder(evidence.selections?.cause_card_order ?? []);
    setRetell(evidence.selections?.retell_links?.[0] ?? null);
    setFullRan(true);
    setRestored(true);
  }

  const motiveDone = C1_P8_MOTIVE_OPTIONS.find((o) => o.id === motive)?.correct === true;
  const cardsDone =
    cardOrder.length === C1_P8_CAUSE_CARD_ORDER.length &&
    C1_P8_CAUSE_CARD_ORDER.every((id, index) => cardOrder[index] === id);
  const retellDone = C1_P8_RETELL_OPTIONS.find((o) => o.id === retell)?.correct === true;
  const workFound = Boolean(savedWork.data?.page && savedWork.data.projectId);
  const completed = Boolean(savedEntry);
  const resolved = motiveDone && cardsDone && workFound && fullRan && retellDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          motive: motive ? [motive] : [],
          cause_card_order: cardOrder,
          retell_links: retell ? [retell] : [],
          full_run: fullRan ? ['start-to-end'] : [],
          run_project: savedWork.data?.projectId ? [savedWork.data.projectId] : [],
          run_saved_version:
            savedWork.data?.savedVersion != null ? [`v${savedWork.data.savedVersion}`] : [],
        },
        prediction: retell ?? undefined,
      }),
    onSuccess: async () => {
      // Stay on the page: the refetched SERVER aggregation decides the seal.
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">水声越来越近了…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center" data-testid="jtw-p8-locked">
        <p className="text-[16px] font-bold text-ink">先在 Part 7 完成并保存你自己的亮相，再来讲回这一章。</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c1-p8">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第一章 石猴出世 · Part 8 · Retell
        </p>
        <h1 className="text-[28px] font-black text-ink">新伙伴听见了水声</h1>
      </header>

      {/* ── story_before：完整儿童正文 + 原著卡 + 原创对白 ───────────── */}
      <section className="space-y-4" data-testid="jtw-p8-story">
        <p className="text-[16px] leading-8 text-ink">{C1_P8_STORY_BEFORE}</p>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C1_P8_CLASSIC_CARD}
        </aside>
        <div className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <p>
            群猴：「{C1_P8_DIALOGUE_MONKEYS}」
          </p>
          <p>
            石猴：「{C1_P8_DIALOGUE_STONE_MONKEY}」
          </p>
        </div>
      </section>

      {/* ── 动机 ────────────────────────────────────────────────────── */}
      <section data-testid="jtw-p8-motive">
        <h2 className="mb-2 text-[15px] font-bold text-ink">石猴为什么同行，又为什么先观察？</h2>
        <div className="flex flex-col gap-2">
          {C1_P8_MOTIVE_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={motive === option.id}
              onPick={() => setMotive(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 五张因果卡（运行之前排列） ───────────────────────────────── */}
      <OrderCards
        title="运行之前：把这一章的五张因果卡按先后排好"
        options={C1_P8_CAUSE_CARDS}
        order={cardOrder}
        onChange={setCardOrder}
        done={cardsDone}
        testId="jtw-p8-cause-cards"
      />

      {/* ── 完整运行 P7 已保存的真实作品 ─────────────────────────────── */}
      <section className="space-y-4" data-testid="jtw-p8-saved-run">
        <h2 className="text-[15px] font-bold text-ink">完整运行你保存的作品</h2>
        {savedWork.isLoading && <p className="text-[13px] text-ink-soft">正在找你的作品…</p>}
        {!savedWork.isLoading && !workFound && (
          <p
            className="rounded-2xl border border-brand-coral/50 bg-canvas-pure p-4 text-[14px] font-semibold text-ink"
            data-testid="jtw-p8-work-missing"
          >
            没有找到你在 Part 7 保存的亮相作品。
            <Link className="ml-1 font-bold text-brand-sky" to="/learn/story/journey-west/jtw-s1-c1-p7">
              回到 Part 7 打开工作区，确认已保存 →
            </Link>
          </p>
        )}
        {savedWork.data?.page && (
          <SavedWorkRun
            page={savedWork.data.page}
            disabled={!cardsDone}
            onRunDone={() => setFullRan(true)}
            sleep={previewSleep}
          />
        )}
      </section>

      {/* ── Retell：因为—所以—结果—后来 ─────────────────────────────── */}
      {fullRan && (
        <section data-testid="jtw-p8-retell">
          <h2 className="mb-2 text-[15px] font-bold text-ink">{C1_P8_RETELL_QUESTION}</h2>
          <div className="flex flex-col gap-2">
            {C1_P8_RETELL_OPTIONS.map((option) => (
              <Choice
                key={option.id}
                option={option}
                active={retell === option.id}
                onPick={() => {
                  setRetell(option.id);
                  setRetellMissed(!option.correct);
                }}
              />
            ))}
          </div>
          {retellMissed && (
            <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
              {C1_P8_RETELL_RETRY_HINT}
            </p>
          )}
        </section>
      )}

      {/* ── 出世印：只由服务端聚合点亮 ──────────────────────────────── */}
      {completed && (
        <section
          className={clsx(
            'relative rounded-2xl p-5 text-center',
            seal?.lit
              ? 'border-4 border-brand-sunshine bg-wash-sunshine'
              : 'border border-hairline bg-canvas-pure',
          )}
          data-testid="jtw-p8-seal"
          data-lit={seal?.lit === true}
        >
          {seal?.lit ? (
            <>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-1 rounded-xl border-2 border-brand-sunshine/60 motion-safe:animate-pulse"
              />
              <p className="text-[24px]" aria-hidden>
                🐵
              </p>
              <p className="text-[20px] font-black text-ink">{C1_P8_SEAL_TITLE}</p>
              <p className="mt-1 text-[15px] font-semibold text-ink">{C1_P8_SEAL_LINE}</p>
            </>
          ) : (
            <p className="text-[14px] font-semibold text-ink-soft">
              出世印还没亮——服务器记录里这一章还缺
              {seal ? ` ${seal.missing.length} ` : '若干'}
              项证据。补齐 P1–P8 的阅读、解释、搭建、运行、修理和讲回证据后它才会点亮。
            </p>
          )}
        </section>
      )}

      {/* ── resolved + story_after ──────────────────────────────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-p8-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C1_P8_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C1_P8_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        {!completed ? (
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-p8-light-seal"
            disabled={!resolved || complete.isPending}
            onClick={() => void complete.mutate()}
          >
            {complete.isPending ? '保存中…' : C1_P8_LIGHT_SEAL_LABEL}
          </button>
        ) : (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="btn-pill-ghost"
              data-testid="jtw-p8-continue-later"
              onClick={() => navigate('/learn/story/journey-west')}
            >
              {C1_P8_CONTINUE_LATER_LABEL}
            </button>
            <button
              type="button"
              className="btn-pill-primary"
              data-testid="jtw-p8-continue-now"
              onClick={() =>
                navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } })
              }
            >
              {C1_P8_CONTINUE_NOW_LABEL}
            </button>
          </div>
        )}
      </footer>
      {complete.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          没有保存上，请再点一次试试。
        </p>
      )}
    </div>
  );
}
