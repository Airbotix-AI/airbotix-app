// Journey to the West · C2-P3 "三段湿石路" — off-screen prediction before Code
// (scene-specs JTW-S1-C2-P3). The stone monkey stands at 2/8 on the same
// waterfall before-background; the round, pointed and long leaves mark the
// three stop points and the three route cards start unsorted. The child states
// the motive, orders the route cards (圆叶=右2 → 尖叶=上1 → 长叶=右2) through
// the accessible replayable tap-to-order component, places the three
// prediction footprints on the grid overlay, then compares 右2→上1→右2 with
// 右2→右2→上1 (上1 moved to the end): the wrong version leaves the wet-stone
// path at its SECOND segment and stops in the water below the entrance, so the
// two versions end at different places. Nothing runs here and no project is
// written — the sorted cards never impersonate a real Blocks project and the
// target chain is shown read-only. Continue persists the evidence server-side
// and unlocks ONLY jtw-s1-c2-p4; kids without C2-P2 get the locked screen
// (server truth); refresh restores the saved route evidence.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { BlockChip } from '../BlockChip';
import {
  C2_P3_CONTINUE_LABEL,
  C2_P3_DEVIATION_OPTIONS,
  C2_P3_DEVIATION_QUESTION,
  C2_P3_DEVIATION_RETRY_HINT,
  C2_P3_FOOTPRINT_HINT,
  C2_P3_GRID_COLS,
  C2_P3_GRID_ROWS,
  C2_P3_MOTIVE_OPTIONS,
  C2_P3_RESOLVED_WORLD_CHANGE,
  C2_P3_ROUTE_CARD_ORDER,
  C2_P3_ROUTE_CARDS,
  C2_P3_START,
  C2_P3_STONE_CELLS,
  C2_P3_STORY_AFTER,
  C2_P3_STORY_BEFORE,
  C2_P3_STORY_BRIDGE,
  C2_P3_TARGET_CHAIN,
  C2_P3_TARGET_STOP_CELLS,
  C2_P3_TARGET_STOPS,
  C2_P3_WRONG_STOP_OPTIONS,
  C2_P3_WRONG_STOP_QUESTION,
  C2_P3_WRONG_VERSION_STOPS,
  JTW_C1_BACKGROUND_ASSET,
  JTW_S1_STORY_LINE_ID,
  JTW_STONE_MONKEY_ASSET,
} from './journeyWestSeason1';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c2-p3';
const NEXT_PART_ID = 'jtw-s1-c2-p4';
const FOOTPRINT_COUNT = C2_P3_TARGET_STOP_CELLS.length;

/** The waterfall Before stage: the monkey at 2/8, the three leaf-marked stop
 *  points and the still-closed curtain; when resolved, the three predicted
 *  stops light up one after another (motion-safe) — the curtain stays closed. */
function WetStoneStage({ resolved }: { resolved: boolean }) {
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
      data-testid="jtw-c2p3-stage"
    >
      <img
        src={JTW_C1_BACKGROUND_ASSET}
        alt="瀑布前的三段湿石路：石猴站在左边的起点，圆叶、尖叶、长叶分别标着三个停点，白色水帘仍然合着"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* 石猴在起点 2/8 — nothing has moved yet. */}
      <img
        src={JTW_STONE_MONKEY_ASSET}
        alt=""
        aria-hidden
        data-testid="jtw-c2p3-stone-monkey"
        data-gx={C2_P3_START.gx}
        data-gy={C2_P3_START.gy}
        className="absolute bottom-[10%] left-[12%] w-[13%]"
      />
      {/* 水帘仍关闭、洞口保持隐藏 — nothing behind the curtain is rendered. */}
      <span data-testid="jtw-c2p3-cave-mouth" data-visible="false" hidden aria-hidden />
      {/* 圆叶、尖叶、长叶分别标示三个停点。 */}
      <ol className="absolute inset-x-[8%] bottom-[4%] flex justify-between" data-testid="jtw-c2p3-leaves">
        {C2_P3_TARGET_STOPS.map((stop, index) => (
          <li
            key={stop.cell}
            data-stop={stop.cell}
            data-lit={resolved}
            style={resolved ? { animationDelay: `${index * 0.4}s` } : undefined}
            className={clsx(
              'rounded-full border px-3 py-1 text-[12px] font-bold text-ink',
              resolved
                ? 'border-brand-sunshine/70 bg-wash-sunshine motion-safe:animate-pulse'
                : 'border-hairline bg-canvas-pure/90',
            )}
          >
            {stop.leaf} · {stop.label}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function JourneyWestC2Part3Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });

  const [motive, setMotive] = useState<string | null>(null);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [footprints, setFootprints] = useState<string[]>([]);
  const [wrongShown, setWrongShown] = useState(false);
  const [compareTried, setCompareTried] = useState(false);
  const [wrongStop, setWrongStop] = useState<string | null>(null);
  const [deviation, setDeviation] = useState<string | null>(null);
  const [deviationMissed, setDeviationMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved route/comparison evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setMotive(evidence.selections?.motive?.[0] ?? null);
    setCardOrder(evidence.selections?.route_card_order ?? []);
    setFootprints(evidence.selections?.footprint_stops ?? []);
    setWrongStop(evidence.selections?.wrong_version_stop?.[0] ?? null);
    setDeviation(evidence.selections?.first_deviation?.[0] ?? null);
    setCompareTried(true);
    setRestored(true);
  }

  const motiveDone = C2_P3_MOTIVE_OPTIONS.find((o) => o.id === motive)?.correct === true;
  // Only 圆叶→尖叶→长叶 (右2→上1→右2) passes.
  const cardsDone =
    cardOrder.length === C2_P3_ROUTE_CARD_ORDER.length &&
    cardOrder.every((id, index) => id === C2_P3_ROUTE_CARD_ORDER[index]);
  // The three prediction footprints must land on the leaf stops in visit order.
  const footprintsDone =
    footprints.length === FOOTPRINT_COUNT &&
    footprints.every((cell, index) => cell === C2_P3_TARGET_STOP_CELLS[index]);
  const footprintsMissed = footprints.length === FOOTPRINT_COUNT && !footprintsDone;
  const wrongStopDone = C2_P3_WRONG_STOP_OPTIONS.find((o) => o.id === wrongStop)?.correct === true;
  const deviationDone = C2_P3_DEVIATION_OPTIONS.find((o) => o.id === deviation)?.correct === true;
  const completed = Boolean(savedEntry);
  const resolved =
    motiveDone && cardsDone && footprintsDone && compareTried && wrongStopDone && deviationDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          motive: motive ? [motive] : [],
          route_card_order: cardOrder,
          footprint_stops: footprints,
          wrong_version_stop: wrongStop ? [wrongStop] : [],
          first_deviation: deviation ? [deviation] : [],
        },
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">湿石上的叶子正被摆开…</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c2p3-locked"
      >
        <p className="text-[16px] font-bold text-ink">
          先在 Part 2 听完瀑布前的约定，再来把湿石路摆清楚。
        </p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  const shownStops = wrongShown ? C2_P3_WRONG_VERSION_STOPS : C2_P3_TARGET_STOPS;

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c2-p3">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第二章 水帘洞的约定 · Part 3
        </p>
        <h1 className="text-[28px] font-black text-ink">三段湿石路</h1>
      </header>

      {/* ── story_before：教学脚本 Story Screen 3 全文 + 因果桥 ─────────── */}
      <section className="space-y-4" data-testid="jtw-c2p3-story">
        {C2_P3_STORY_BEFORE.map((paragraph) => (
          <p key={paragraph.slice(0, 12)} className="text-[16px] leading-8 text-ink">
            {paragraph}
          </p>
        ))}
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C2_P3_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── Before 舞台：石猴在 2/8，三片叶子标停点，水帘仍关闭 ─────────── */}
      <WetStoneStage resolved={resolved || completed} />

      {/* ── 动机：把停点讲清楚，让伙伴能预测 ────────────────────────────── */}
      <section data-testid="jtw-c2p3-motive">
        <h2 className="mb-2 text-[15px] font-bold text-ink">石猴为什么要一段一段摆路线？</h2>
        <div className="flex flex-col gap-2">
          {C2_P3_MOTIVE_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={motive === option.id}
              onPick={() => setMotive(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 三张路线卡排序（可访问、可重放，不是单选题） ─────────────────── */}
      <OrderCards
        title="把三张路线卡摆成石猴要走的顺序"
        options={C2_P3_ROUTE_CARDS}
        order={cardOrder}
        onChange={setCardOrder}
        done={cardsDone}
        testId="jtw-c2p3-cards"
      />

      {/* ── 网格预测覆盖层：放三个预测脚印 ──────────────────────────────── */}
      {cardsDone && (
        <section data-testid="jtw-c2p3-grid">
          <h2 className="mb-2 text-[15px] font-bold text-ink">
            按到达顺序，把三个预测脚印放到停点上（先放第 1 个）
          </h2>
          <div className="inline-block rounded-2xl border border-hairline bg-canvas-pure p-2">
            {C2_P3_GRID_ROWS.map((gy) => (
              <div key={gy} className="flex">
                {C2_P3_GRID_COLS.map((gx) => {
                  const cell = `${gx}-${gy}`;
                  const isStart = gx === C2_P3_START.gx && gy === C2_P3_START.gy;
                  const stone = C2_P3_STONE_CELLS.has(cell);
                  const leaf = C2_P3_TARGET_STOPS.find((stop) => stop.cell === cell);
                  const position = footprints.indexOf(cell);
                  return (
                    <button
                      key={cell}
                      type="button"
                      disabled={isStart}
                      aria-label={`格子 横${gx} 竖${gy}`}
                      aria-pressed={position >= 0}
                      data-cell={cell}
                      data-terrain={stone ? 'stone' : 'water'}
                      className={clsx(
                        'relative m-0.5 flex h-11 w-11 items-center justify-center rounded-lg border text-[16px] transition',
                        stone
                          ? 'border-hairline bg-wash-sunshine/60'
                          : 'border-hairline/60 bg-wash-sky/50',
                        position >= 0 && 'border-brand-sky bg-wash-sky',
                      )}
                      onClick={() =>
                        setFootprints((current) =>
                          current.includes(cell)
                            ? current.filter((c) => c !== cell)
                            : current.length < FOOTPRINT_COUNT
                              ? [...current, cell]
                              : current,
                        )
                      }
                    >
                      {isStart ? '🐵' : leaf ? leaf.leaf.split(' ')[0] : ''}
                      {position >= 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-sky text-[11px] font-black text-white">
                          {position + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {footprints.length > 0 && (
            <button
              type="button"
              className="btn-pill-ghost ml-3 text-[13px]"
              onClick={() => setFootprints([])}
            >
              重放脚印
            </button>
          )}
          {footprintsMissed && (
            <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
              {C2_P3_FOOTPRINT_HINT}
            </p>
          )}
        </section>
      )}

      {/* ── 两版比较：右2→上1→右2 vs 右2→右2→上1（可反复切换重放） ──────── */}
      {footprintsDone && (
        <section
          className="rounded-2xl border border-brand-sky/40 bg-wash-sky p-5"
          data-testid="jtw-c2p3-compare"
        >
          <h2 className="text-[15px] font-bold text-ink">
            同伴问：要是把“上1”放到最后（右2→右2→上1），石猴会停在哪里？
          </h2>
          <ol
            className="mt-3 flex flex-wrap gap-2"
            data-testid="jtw-c2p3-compare-track"
            data-version={wrongShown ? 'wrong' : 'target'}
          >
            {shownStops.map((stop, index) => (
              <li
                key={stop.cell}
                data-stop={stop.cell}
                className={clsx(
                  'rounded-2xl border bg-canvas-pure px-4 py-2 text-[14px] font-semibold text-ink',
                  wrongShown && index > 0 ? 'border-brand-coral/60' : 'border-hairline',
                )}
              >
                <span className="mr-1 text-[12px] font-black text-ink-soft">第{index + 1}段</span>
                {stop.label}
              </li>
            ))}
            {wrongShown && (
              <li className="rounded-2xl border border-brand-coral/60 bg-canvas-pure px-4 py-2 text-[14px] font-semibold text-brand-coral">
                停住了——到不了水帘入口
              </li>
            )}
          </ol>
          <button
            type="button"
            className="btn-pill-secondary mt-4"
            data-testid="jtw-c2p3-compare-toggle"
            onClick={() => {
              setWrongShown((current) => !current);
              setCompareTried(true);
            }}
          >
            {wrongShown ? '换回 右2→上1→右2' : '把上1放到最后试试'}
          </button>

          {compareTried && (
            <div className="mt-4 space-y-4">
              <div data-testid="jtw-c2p3-wrong-stop">
                <h3 className="mb-2 text-[14px] font-bold text-ink">{C2_P3_WRONG_STOP_QUESTION}</h3>
                <div className="flex flex-col gap-2">
                  {C2_P3_WRONG_STOP_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      option={option}
                      active={wrongStop === option.id}
                      onPick={() => setWrongStop(option.id)}
                    />
                  ))}
                </div>
              </div>
              <div data-testid="jtw-c2p3-deviation">
                <h3 className="mb-2 text-[14px] font-bold text-ink">{C2_P3_DEVIATION_QUESTION}</h3>
                <div className="flex flex-col gap-2">
                  {C2_P3_DEVIATION_OPTIONS.map((option) => (
                    <Choice
                      key={option.id}
                      option={option}
                      active={deviation === option.id}
                      onPick={() => {
                        setDeviation(option.id);
                        setDeviationMissed(!option.correct);
                      }}
                    />
                  ))}
                </div>
                {deviationMissed && (
                  <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
                    {C2_P3_DEVIATION_RETRY_HINT}
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 只读目标链（不运行——排序卡不冒充真实 Blocks 项目） ──────────── */}
      <section data-testid="jtw-c2p3-target-chain">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          目标路线长这样（只读，还没真实运行——下一个 Part 才轮到你搭）：
        </h2>
        <div className="flex flex-wrap items-center gap-1">
          {C2_P3_TARGET_CHAIN.map((block, index) => (
            <BlockChip
              key={`${block.op}-${index}`}
              block={block}
              inChain
              isLast={index === C2_P3_TARGET_CHAIN.length - 1}
            />
          ))}
        </div>
      </section>

      {/* ── resolved world change + story_after + continue ──────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c2p3-resolved"
        >
          <p className="text-[15px] leading-7 text-ink">{C2_P3_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C2_P3_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c2p3-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C2_P3_CONTINUE_LABEL}
        </button>
      </footer>
      {complete.isError && (
        <p className="text-right text-[13px] font-semibold text-brand-coral" role="alert">
          没有保存上，请再点一次试试。
        </p>
      )}
    </div>
  );
}
