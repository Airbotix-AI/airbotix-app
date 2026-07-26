// Journey to the West · C3-P1 "快乐的家，也装不下所有问题" — chapter three's
// Read & Why entry (scene-specs JTW-S1-C3-P1).
//
// The monkey king stands on the home shore of the chapter's Page 1 background,
// the mountain behind him and the open sea to his right. The child reads 故事卡A
// and 故事卡B in full (both screens are a MEASURED read, not an assumption),
// points at 花果山 / 水帘洞 / 海面 on the same-screen map — each place shown with
// its own real artwork — replays the sea wind, orders the TWO real motive cards
// (想拿宝物 / 不喜欢伙伴 are refused with the story's own words), completes
// 虽然这里很快乐，但是他想到…，所以决定…, and answers which line of the text
// would stop being true if he simply disliked Flower-Fruit Mountain.
//
// No blocks are edited and NO project is written here. Continue persists the
// evidence server-side and unlocks ONLY jtw-s1-c3-p2; kids who have not finished
// C2-P8 get the locked screen (server truth).

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { GRID_H, GRID_W } from '../blocksModel';
import { sfx } from '../sounds';
import {
  JTW_C3_MONKEY_FRIENDS_SPRITE,
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SIZE,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE1_BACKGROUND,
  JTW_C3_PAGE1_RESOLVED_BACKGROUND,
  JTW_C3_PAGE1_START_CELL,
  JTW_C3_SEA_WIND_SOUND_ID,
} from '../jtwC3Stage';
import { JTW_S1_STORY_LINE_ID } from './journeyWestSeason1';
import {
  C3_P1_AUDIO_AGAIN_LABEL,
  C3_P1_AUDIO_ID,
  C3_P1_AUDIO_LABEL,
  C3_P1_AUDIO_NOTE,
  C3_P1_CLASSIC_CARD,
  C3_P1_CONTINUE_LABEL,
  C3_P1_DIALOGUE,
  C3_P1_LOADING_HINT,
  C3_P1_LOCKED_HINT,
  C3_P1_MAP_PLACES,
  C3_P1_MAP_TITLE,
  C3_P1_MOTIVE_CARDS,
  C3_P1_MOTIVE_REJECT_HINT,
  C3_P1_MOTIVE_TITLE,
  C3_P1_NEXT_SCREEN_LABEL,
  C3_P1_PREDICTION_OPTIONS,
  C3_P1_PREDICTION_QUESTION,
  C3_P1_PREDICTION_RETRY_HINT,
  C3_P1_PREV_SCREEN_LABEL,
  C3_P1_RESOLVED_WORLD_CHANGE,
  C3_P1_SCREEN_IDS,
  C3_P1_STORY_AFTER,
  C3_P1_STORY_BRIDGE,
  C3_P1_STORY_SCREENS,
  C3_P1_UNREAD_HINT,
  C3_P1_WHY_BUT_OPTIONS,
  C3_P1_WHY_SENTENCE_LEAD,
  C3_P1_WHY_SO_LEAD,
  C3_P1_WHY_SO_OPTIONS,
  c3p1MapPointed,
  c3p1MotiveOrdered,
  c3p1PredictionDone,
  c3p1StoryRead,
  c3p1WhySentenceDone,
  c3p1WrongMotivePicked,
} from './journeyWestC3Part1Program';
import { completeStoryPart, fetchStoryLineProgress, type StoryPartEvidence } from './storyPartsApi';
import { Choice, OrderCards } from './partUi';

const PART_ID = 'jtw-s1-c3-p1';
const NEXT_PART_ID = 'jtw-s1-c3-p2';

/** Foot-anchored grid placement, exactly as the C2 stages compute it. */
const MONKEY_LEFT_PERCENT = (JTW_C3_PAGE1_START_CELL.gx / (GRID_W - 1)) * 100;
const MONKEY_TOP_PERCENT = (JTW_C3_PAGE1_START_CELL.gy / (GRID_H - 1)) * 100;

const STAGE_BEFORE_ALT =
  '花果山海岸：左边是长着桃树的山，右边的海一直连到天边，中间是一片空着的沙滩';
const STAGE_RESOLVED_ALT =
  '同一片海岸，海上的风纹亮成凉凉的青色，一直连到天边';

/**
 * Page 1 的舞台：猴王站在山脚的海岸上望向海面。
 *
 * 场景规格写的是“猴王先出现于洞口”，但已整合的 C3 Page 1 画面里没有洞口，
 * C2 的洞口画面里也没有海——把洞口画到这张海岸图上就是伪造地标。所以这里按
 * C3共享合同的 `gx=3 / gy=9` 把他放在山脚的海岸上（水帘洞在他身后的山里，
 * 地图上用真实的水帘洞画面指出来），这条取舍记录在素材圣经里。
 */
function HomeShoreStage({ resolved, wind }: { resolved: boolean; wind: boolean }) {
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
      data-testid="jtw-c3p1-stage"
      data-world-state={resolved ? 'route-light' : 'home-shore'}
    >
      <img
        src={resolved ? JTW_C3_PAGE1_RESOLVED_BACKGROUND : JTW_C3_PAGE1_BACKGROUND}
        alt={resolved ? STAGE_RESOLVED_ALT : STAGE_BEFORE_ALT}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* 猴王站在山脚的海岸上，面朝右边的海面。 */}
      <img
        src={JTW_C3_MONKEY_KING_SPRITE}
        alt=""
        aria-hidden
        data-testid="jtw-c3p1-monkey-king"
        data-character={JTW_C3_MONKEY_KING_ID}
        data-gx={JTW_C3_PAGE1_START_CELL.gx}
        data-gy={JTW_C3_PAGE1_START_CELL.gy}
        data-size={JTW_C3_MONKEY_KING_SIZE}
        data-facing="sea"
        className="absolute w-[14%] -translate-x-1/2 -translate-y-full"
        style={{ left: `${MONKEY_LEFT_PERCENT}%`, top: `${MONKEY_TOP_PERCENT}%` }}
      />
      {/* 海风的三道风纹 —— 静音时声音仍然读得出来。 */}
      {(wind || resolved) && (
        <span
          data-testid="jtw-c3p1-wind-lines"
          aria-hidden
          className="absolute right-[16%] top-[26%] block h-16 w-24"
        >
          <span className="absolute inset-x-0 top-0 block h-1 rounded-full bg-sky-200/90 motion-safe:animate-pulse" />
          <span className="absolute inset-x-2 top-6 block h-1 rounded-full bg-sky-200/80" />
          <span className="absolute inset-x-4 top-12 block h-1 rounded-full bg-sky-200/70" />
        </span>
      )}
    </div>
  );
}

export function JourneyWestC3Part1Page() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const progress = useQuery({
    queryKey: ['story-parts', JTW_S1_STORY_LINE_ID],
    queryFn: () => fetchStoryLineProgress(JTW_S1_STORY_LINE_ID),
  });

  const [screenIndex, setScreenIndex] = useState(0);
  const [screensRead, setScreensRead] = useState<string[]>([C3_P1_SCREEN_IDS[0]]);
  const [places, setPlaces] = useState<string[]>([]);
  const [audioPlayed, setAudioPlayed] = useState(false);
  const [cardOrder, setCardOrder] = useState<string[]>([]);
  const [whyBut, setWhyBut] = useState<string | null>(null);
  const [whySo, setWhySo] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [predictionMissed, setPredictionMissed] = useState(false);
  const [restored, setRestored] = useState(false);

  const savedEntry = progress.data?.completed.find((entry) => entry.part_id === PART_ID);
  const unlocked = progress.data?.unlocked_part_ids.includes(PART_ID) ?? false;

  // A refreshed page restores the saved Read/Why evidence exactly once.
  if (savedEntry && !restored) {
    const evidence = savedEntry.evidence as StoryPartEvidence;
    setScreensRead(evidence.selections?.story_screens ?? [...C3_P1_SCREEN_IDS]);
    setPlaces(evidence.selections?.map_places ?? []);
    setAudioPlayed((evidence.selections?.audio_replay ?? []).length > 0);
    setCardOrder(evidence.selections?.motive_card_order ?? []);
    setWhyBut(evidence.selections?.why_sentence?.[0] ?? null);
    setWhySo(evidence.selections?.why_sentence?.[1] ?? null);
    setPrediction(evidence.prediction ?? null);
    setRestored(true);
  }

  const storyDone = c3p1StoryRead(screensRead);
  const mapDone = c3p1MapPointed(places);
  const wrongCardPicked = c3p1WrongMotivePicked(cardOrder);
  const cardsDone = c3p1MotiveOrdered(cardOrder);
  const whyDone = c3p1WhySentenceDone(whyBut, whySo);
  const predictionDone = c3p1PredictionDone(prediction);
  const completed = Boolean(savedEntry);
  const resolved = storyDone && mapDone && cardsDone && whyDone && predictionDone;

  const complete = useMutation({
    mutationFn: () =>
      completeStoryPart(JTW_S1_STORY_LINE_ID, PART_ID, {
        schema_version: 1,
        selections: {
          story_screens: screensRead,
          map_places: places,
          audio_replay: audioPlayed ? [C3_P1_AUDIO_ID] : [],
          motive_card_order: cardOrder,
          why_sentence: whyBut && whySo ? [whyBut, whySo] : [],
        },
        prediction: prediction ?? undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['story-parts', JTW_S1_STORY_LINE_ID] });
      navigate('/learn/story/journey-west', { state: { unlocked: NEXT_PART_ID } });
    },
  });

  if (progress.isLoading) {
    return <p className="p-8 text-center text-ink-soft">{C3_P1_LOADING_HINT}</p>;
  }

  if (!unlocked && !completed) {
    return (
      <div
        className="mx-auto max-w-3xl space-y-4 px-4 py-10 text-center"
        data-testid="jtw-c3p1-locked"
      >
        <p className="text-[16px] font-bold text-ink">{C3_P1_LOCKED_HINT}</p>
        <Link className="btn-pill-primary inline-block" to="/learn/story/journey-west">
          回到故事地图
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8" data-testid="jtw-part-c3-p1">
      <header>
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-sky">
          西游记 · 第三章 一叶木筏求师路 · Part 1
        </p>
        <h1 className="text-[28px] font-black text-ink">快乐的家，也装不下所有问题</h1>
      </header>

      {/* ── story_before：故事卡A、B 全文，两屏；读过哪一屏是被记录的证据 ── */}
      <section className="space-y-4" data-testid="jtw-c3p1-story" data-screen={screenIndex + 1}>
        <p className="text-[16px] leading-8 text-ink">{C3_P1_STORY_SCREENS[screenIndex]}</p>
        {screenIndex === 1 && (
          <div className="rounded-2xl border border-hairline bg-canvas-pure p-4">
            {C3_P1_DIALOGUE.map((line) => (
              <p key={line.slice(0, 6)} className="text-[15px] leading-8 text-ink">
                {line}
              </p>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          {screenIndex > 0 && (
            <button
              type="button"
              className="btn-pill-ghost text-[13px]"
              data-testid="jtw-c3p1-story-prev"
              onClick={() => setScreenIndex(0)}
            >
              {C3_P1_PREV_SCREEN_LABEL}
            </button>
          )}
          {screenIndex === 0 && (
            <button
              type="button"
              className="btn-pill-primary text-[13px]"
              data-testid="jtw-c3p1-story-next"
              onClick={() => {
                setScreenIndex(1);
                setScreensRead((current) =>
                  current.includes(C3_P1_SCREEN_IDS[1])
                    ? current
                    : [...current, C3_P1_SCREEN_IDS[1]],
                );
              }}
            >
              {C3_P1_NEXT_SCREEN_LABEL}
            </button>
          )}
          <span className="text-[12px] font-bold text-ink-soft" data-testid="jtw-c3p1-story-count">
            {screensRead.length} / {C3_P1_SCREEN_IDS.length} 段
          </span>
        </div>
        <aside className="rounded-2xl border border-brand-sunshine/50 bg-wash-sunshine p-4 text-[14px] text-ink">
          <span className="font-bold">原著小卡片：</span>
          {C3_P1_CLASSIC_CARD}
        </aside>
        <aside className="rounded-2xl border border-hairline bg-canvas-pure p-4 text-[14px] leading-7 text-ink">
          <span className="font-bold">故事—程序桥：</span>
          {C3_P1_STORY_BRIDGE}
        </aside>
      </section>

      {/* ── Before 舞台 + 音频重放 ─────────────────────────────────────── */}
      <section className="space-y-3">
        <HomeShoreStage resolved={resolved || completed} wind={audioPlayed} />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-pill-primary"
            data-testid="jtw-c3p1-audio"
            onClick={() => {
              sfx.playSound(JTW_C3_SEA_WIND_SOUND_ID);
              setAudioPlayed(true);
            }}
          >
            {audioPlayed ? C3_P1_AUDIO_AGAIN_LABEL : C3_P1_AUDIO_LABEL}
          </button>
          <span className="text-[12px] text-ink-soft">{C3_P1_AUDIO_NOTE}</span>
        </div>
      </section>

      {/* ── 同屏地图：花果山 / 水帘洞 / 海面，各用自己真实的场景图 ────── */}
      <section data-testid="jtw-c3p1-map">
        <h2 className="mb-2 text-[15px] font-bold text-ink">
          {C3_P1_MAP_TITLE}
          {mapDone && <span className="ml-2 text-brand-mint">✓</span>}
        </h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {C3_P1_MAP_PLACES.map((place) => {
            const picked = places.includes(place.id);
            return (
              <button
                key={place.id}
                type="button"
                aria-pressed={picked}
                data-place={place.id}
                className={clsx(
                  'overflow-hidden rounded-2xl border text-left transition',
                  picked
                    ? 'border-brand-mint bg-wash-mint text-ink'
                    : 'border-hairline bg-canvas-pure text-ink-soft hover:border-brand-mint/60',
                )}
                onClick={() =>
                  setPlaces((current) =>
                    current.includes(place.id)
                      ? current.filter((id) => id !== place.id)
                      : [...current, place.id],
                  )
                }
              >
                <img src={place.asset} alt={place.alt} className="h-24 w-full object-cover" />
                <span className="block px-3 py-2">
                  <span className="block text-[14px] font-bold">{place.label}</span>
                  <span className="block text-[12px] leading-5">{place.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 两张动机卡排序（读完正文才打开） ──────────────────────────── */}
      {storyDone ? (
        <>
          <OrderCards
            title={C3_P1_MOTIVE_TITLE}
            options={[...C3_P1_MOTIVE_CARDS]}
            order={cardOrder}
            onChange={setCardOrder}
            done={cardsDone}
            testId="jtw-c3p1-motives"
          />
          {wrongCardPicked && (
            <p className="text-[13px] font-semibold text-brand-coral" role="status">
              {C3_P1_MOTIVE_REJECT_HINT}
            </p>
          )}
        </>
      ) : (
        <p className="text-[13px] font-semibold text-brand-coral" data-testid="jtw-c3p1-unread">
          {C3_P1_UNREAD_HINT}
        </p>
      )}

      {/* ── Why 句式：虽然…但是…所以… ────────────────────────────────── */}
      <section data-testid="jtw-c3p1-why">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C3_P1_WHY_SENTENCE_LEAD}</h2>
        <div className="flex flex-col gap-2">
          {C3_P1_WHY_BUT_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={whyBut === option.id}
              onPick={() => setWhyBut(option.id)}
            />
          ))}
        </div>
        <h3 className="mb-2 mt-4 text-[15px] font-bold text-ink">{C3_P1_WHY_SO_LEAD}</h3>
        <div className="flex flex-col gap-2">
          {C3_P1_WHY_SO_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={whySo === option.id}
              onPick={() => setWhySo(option.id)}
            />
          ))}
        </div>
      </section>

      {/* ── 预测 ────────────────────────────────────────────────────── */}
      <section data-testid="jtw-c3p1-prediction">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{C3_P1_PREDICTION_QUESTION}</h2>
        <div className="flex flex-col gap-2">
          {C3_P1_PREDICTION_OPTIONS.map((option) => (
            <Choice
              key={option.id}
              option={option}
              active={prediction === option.id}
              onPick={() => {
                setPrediction(option.id);
                setPredictionMissed(!option.correct);
              }}
            />
          ))}
        </div>
        {predictionMissed && (
          <p className="mt-2 text-[13px] font-semibold text-brand-coral" role="status">
            {C3_P1_PREDICTION_RETRY_HINT}
          </p>
        )}
      </section>

      {/* ── resolved world change + story_after + continue ──────────── */}
      {(resolved || completed) && (
        <section
          className="rounded-2xl border border-brand-mint/40 bg-wash-mint p-5"
          data-testid="jtw-c3p1-resolved"
        >
          <img
            src={JTW_C3_MONKEY_FRIENDS_SPRITE}
            alt="三只群猴从山上下来，站到岸边"
            data-testid="jtw-c3p1-friends"
            className="mb-3 w-full max-w-sm"
          />
          <p className="text-[15px] leading-7 text-ink">{C3_P1_RESOLVED_WORLD_CHANGE}</p>
          <p className="mt-2 text-[15px] font-semibold text-ink">{C3_P1_STORY_AFTER}</p>
        </section>
      )}

      <footer className="flex items-center justify-between gap-4">
        <Link className="text-[13px] font-bold text-brand-sky" to="/learn/story/journey-west">
          ← 回到故事地图
        </Link>
        <button
          type="button"
          className="btn-pill-primary"
          data-testid="jtw-c3p1-continue"
          disabled={(!resolved && !completed) || complete.isPending}
          onClick={() => void complete.mutate()}
        >
          {complete.isPending ? '保存中…' : C3_P1_CONTINUE_LABEL}
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
