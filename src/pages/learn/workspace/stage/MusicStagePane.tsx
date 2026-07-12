// Music Stage — the studio=music opening + main interaction layer
// (music-stage-prd.md §2–§3). Replaces the form-based setup and the chat
// input for music sessions while reusing the Workspace session/message flow:
// every generation is a message pair, versions aggregate client-side.
//
// Mount with key={sessionId} — stage state (styles, versions meta, genre)
// is session-scoped by design, like the sibling setupValues.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';

import { ApiError } from '@/lib/api';
import { friendlyError } from '../../create/shared/useStudio';
import type { Message } from '../WorkspacePage';
import { MusicTrackList } from '../MusicTrackList';
import { AiDeck } from './AiDeck';
import { ComposerBar } from './ComposerBar';
import { StageView, type StageSlotView } from './StageView';
import { TrackLanes } from './TrackLanes';
import {
  generateMusicScore,
  saveScoreToMyWorks,
  type MusicScoreRequest,
} from './musicScoreApi';
import type { InstrumentKind, MusicScore } from './scoreTypes';
import { preloadPrograms } from './soundfont';
import { fmtTime, stepIndexAt } from './scoreUtils';
import {
  COMPOSE_FAILED_BUBBLE,
  FIRST_COMPOSE_SUBTITLE,
  FIRST_VERSION_TAG,
  GENRE_BY_ID,
  EMPTY_MARQUEE,
  INITIAL_BUBBLE,
  MUSIC_GENERATION_COST_STARS,
  REWRITE_VERSION_TAG,
  SAVE_FAILED_BUBBLE,
  STAGE_SLOTS,
  STYLE_NONE,
  buildAiBubble,
  iterationSubtitle,
  marqueeFor,
  outOfStarsBubble,
  stageSlotFor,
  styleOf,
  type GenreId,
  type StageSlotId,
  type StageStyles,
  type SuggestionCard,
  type SuggestionKey,
} from './stageData';
import { aggregateScoreVersions } from './versions';
import { useScorePlayback } from './useScorePlayback';

interface VersionMeta {
  label: string;
  modifier?: SuggestionKey;
}

interface Attempt {
  req: MusicScoreRequest;
  meta: VersionMeta;
  subtitle: string;
}

export function MusicStagePane({
  sessionId,
  messages,
  balance,
  kidId,
  familyId,
  onImportTrack,
}: {
  sessionId: string;
  messages: Message[];
  balance: number;
  kidId: string | null;
  familyId: string | null;
  onImportTrack: () => void;
}) {
  const qc = useQueryClient();
  const composerRef = useRef<HTMLInputElement>(null);

  const [input, setInput] = useState('');
  const [genre, setGenre] = useState<GenreId>('rock');
  const [selectedSlot, setSelectedSlot] = useState<StageSlotId | null>(null);
  const [styles, setStyles] = useState<StageStyles>({ ...GENRE_BY_ID.rock.presetStyles });
  // null = follow the latest version; a number pins an older version (0⭐).
  const [pinnedVersion, setPinnedVersion] = useState<number | null>(null);
  const [versionMeta, setVersionMeta] = useState<Record<number, VersionMeta>>({});
  const [bubbleOverride, setBubbleOverride] = useState<string | null>(null);
  const [failed, setFailed] = useState<Attempt | null>(null);
  const [composeSubtitle, setComposeSubtitle] = useState(FIRST_COMPOSE_SUBTITLE);
  const [entering, setEntering] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // ⚙️ Mixer = the legacy MusicTrackList mini-DAW region (real-audio tracks)
  // until the score Mixer (parent PRD §3.5–3.9) lands — see music-stage-prd
  // D-MX1. Lane ⋯ menu entries deep-link here too.
  const [mixerOpen, setMixerOpen] = useState(false);
  // Versions already promoted to My Works this visit (💾, PRD §2 step ⑤).
  const [savedVersions, setSavedVersions] = useState<Record<number, boolean>>({});

  const pendingRef = useRef<VersionMeta | null>(null);
  const lastPromptRef = useRef<string | null>(null);
  // 0⭐ style switches since the last successful generation — sent as the
  // audit `style_changes` counter (music-stage-prd §8), then reset.
  const styleChangesRef = useRef(0);
  // null until mount: revisiting a session with existing versions must not
  // replay the "new version arrived" choreography (labels/pop-in/auto-play).
  const prevVersionCountRef = useRef<number | null>(null);

  const versions = useMemo(() => aggregateScoreVersions(messages), [messages]);
  const currentVersion =
    pinnedVersion !== null && pinnedVersion < versions.length
      ? pinnedVersion
      : versions.length - 1;
  const score = versions[currentVersion]?.score ?? null;
  const hasSong = score !== null;

  // Instruments silenced by style = None (0⭐, per stage slot — PRD §3.1/§5).
  const silenced = useMemo(() => {
    const out = new Set<InstrumentKind>();
    for (const t of score?.tracks ?? []) {
      if (styles[stageSlotFor(t.instrument)] === STYLE_NONE) out.add(t.instrument);
    }
    return out;
  }, [score, styles]);

  const playback = useScorePlayback(score, silenced, styles);
  const { play: playbackPlay, stop: playbackStop, unlock: playbackUnlock, onPulse } = playback;

  const generation = useMutation({
    mutationFn: (req: MusicScoreRequest) => generateMusicScore(req),
    onSuccess: () => {
      styleChangesRef.current = 0; // counted per generation window (§8)
      qc.invalidateQueries({ queryKey: ['session', sessionId, 'messages'] });
      qc.invalidateQueries({ queryKey: ['kid', kidId, 'sessions'] });
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
    },
    onError: (e: unknown) => {
      // Failed generations charge nothing (backend rule); the per-call
      // onError in `fire` records the attempt for the "Try again" button.
      pendingRef.current = null;
      setBubbleOverride(
        e instanceof ApiError && !e.code.startsWith('HTTP_')
          ? friendlyError(e)
          : COMPOSE_FAILED_BUBBLE,
      );
    },
  });

  const save = useMutation({
    mutationFn: (args: { score: MusicScore; version: number }) =>
      saveScoreToMyWorks(args.score),
    onSuccess: (_res, args) => {
      setSavedVersions((m) => ({ ...m, [args.version]: true }));
      qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] });
    },
    onError: () => setBubbleOverride(SAVE_FAILED_BUBBLE),
  });

  // A new version arrived: label it, follow it, start the show.
  useEffect(() => {
    const prev = prevVersionCountRef.current;
    prevVersionCountRef.current = versions.length;
    if (prev === null) {
      // Reloaded session: pick a default spotlight target, nothing else.
      if (versions.length > 0) setSelectedSlot((s) => s ?? 'keys');
      return;
    }
    if (versions.length <= prev) return;
    const idx = versions.length - 1;
    const pending = pendingRef.current;
    pendingRef.current = null;
    setVersionMeta((m) =>
      m[idx] ? m : { ...m, [idx]: pending ?? { label: idx === 0 ? FIRST_VERSION_TAG : REWRITE_VERSION_TAG } },
    );
    setPinnedVersion(null);
    setBubbleOverride(null);
    setFailed(null);
    if (prev === 0) {
      // First song: the AI pre-picks a style set for the genre (PRD §5) and
      // the band enters with the staggered pop-in (PRD §3.1).
      setStyles({ ...GENRE_BY_ID[genre].presetStyles });
      setSelectedSlot((s) => s ?? 'keys');
      setEntering(true);
    }
    void playbackPlay(); // audio was unlocked inside the generate click
  }, [versions.length, genre, playbackPlay]);

  useEffect(() => {
    if (!entering) return;
    const t = window.setTimeout(() => setEntering(false), 1000);
    return () => window.clearTimeout(t);
  }, [entering]);

  const fire = useCallback(
    (req: MusicScoreRequest, meta: VersionMeta, subtitle: string) => {
      if (generation.isPending) return;
      if (balance < MUSIC_GENERATION_COST_STARS) {
        // AC-8: never send the request when Stars are short.
        setBubbleOverride(outOfStarsBubble(balance));
        return;
      }
      pendingRef.current = meta;
      setComposeSubtitle(subtitle);
      setBubbleOverride(null);
      setFailed(null);
      if (playback.isPlaying) playbackStop();
      void playbackUnlock();
      // Warm the soundfont cache while the composing animation runs — the
      // first song uses the genre's preset styles (PRD §6.1).
      const styleSet =
        versions.length === 0 ? GENRE_BY_ID[genre].presetStyles : styles;
      preloadPrograms(
        STAGE_SLOTS.flatMap((slot) => {
          const program = styleOf(slot.id, styleSet[slot.id])?.gmProgram;
          return program == null ? [] : [program];
        }),
      );
      // The counter rides the request at send time (not capture time) so a
      // "Try again" retry reports switches made while looking at the error.
      const styleChanges = styleChangesRef.current;
      generation.mutate(
        { ...req, ...(styleChanges > 0 ? { style_changes: styleChanges } : {}) },
        {
          onError: () => setFailed({ req, meta, subtitle }),
        },
      );
    },
    [generation, balance, playback.isPlaying, playbackStop, playbackUnlock, versions.length, genre, styles],
  );

  /** Composer-bar generate: a fresh direction — modifier cleared (PRD §3.4). */
  const generateFromPrompt = () => {
    const prompt = input.trim();
    if (!prompt) return;
    lastPromptRef.current = prompt;
    fire(
      { prompt, options: { genre: GENRE_BY_ID[genre].promptLabel } },
      { label: versions.length === 0 ? FIRST_VERSION_TAG : REWRITE_VERSION_TAG },
      FIRST_COMPOSE_SUBTITLE,
    );
  };

  /** Suggestion card: same endpoint + existingScore + structured modifier. */
  const generateFromCard = (card: SuggestionCard) => {
    const prompt = lastPromptRef.current ?? input.trim();
    if (!prompt || !score) return;
    const req: MusicScoreRequest = {
      prompt,
      options: { genre: GENRE_BY_ID[genre].promptLabel },
      modifier: card.key,
      // "Surprise me" re-rolls the whole arrangement from the same prompt.
      ...(card.freshSeed ? {} : { existingScore: score }),
    };
    fire(req, { label: card.tag, modifier: card.key }, iterationSubtitle(card.tag));
  };

  // Restore the last prompt for suggestion cards on reloaded sessions.
  useEffect(() => {
    if (lastPromptRef.current) return;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content.trim()) {
        lastPromptRef.current = messages[i].content.trim();
        break;
      }
    }
  }, [messages]);

  const slotViews: StageSlotView[] = STAGE_SLOTS.map((slot) => {
    const style = styleOf(slot.id, styles[slot.id]);
    const slotInstruments = (score?.tracks ?? [])
      .map((t) => t.instrument)
      .filter((i) => stageSlotFor(i) === slot.id);
    const allMuted =
      slotInstruments.length > 0 &&
      slotInstruments.every(
        (i) =>
          !!playback.muted[i] ||
          silenced.has(i) ||
          (playback.solo !== null && playback.solo !== i),
      );
    const isNone = styles[slot.id] === STYLE_NONE;
    return {
      id: slot.id,
      emoji: slot.emoji,
      label: slot.label,
      styleLabel: hasSong ? (style && !isNone ? `${style.emoji} ${style.label}` : '🚫 None') : null,
      off: hasSong && (isNone || allMuted),
    };
  });

  const registerStagePulse = useCallback(
    (cb: (slot: StageSlotId) => void) => onPulse((instrument) => cb(stageSlotFor(instrument))),
    [onPulse],
  );

  const bubble =
    bubbleOverride ??
    (score
      ? buildAiBubble({
          score,
          modifier: versionMeta[currentVersion]?.modifier,
          isFirst: currentVersion === 0,
        })
      : INITIAL_BUBBLE);

  const retry = failed ? () => fire(failed.req, failed.meta, failed.subtitle) : null;
  const hasAudioTracks = useMemo(
    () => messages.some((m) => m.role === 'assistant' && m.artifact?.kind === 'audio'),
    [messages],
  );
  const activeStep =
    playback.isPlaying && score ? stepIndexAt(playback.position, score.tempo) : null;

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-canvas" data-testid="music-stage-pane">
      <div className="flex-1 overflow-y-auto">
        <ComposerBar
          value={input}
          onChange={setInput}
          genre={genre}
          onGenre={setGenre}
          onGenerate={generateFromPrompt}
          busy={generation.isPending}
          balance={balance}
          inputRef={composerRef}
        />

        <StageView
          slots={slotViews}
          empty={!hasSong}
          marquee={hasSong ? marqueeFor(score?.genre, genre) : EMPTY_MARQUEE}
          selected={hasSong ? selectedSlot : null}
          onSelect={setSelectedSlot}
          activeStep={activeStep}
          composingSubtitle={generation.isPending ? composeSubtitle : null}
          entering={entering}
          registerPulse={registerStagePulse}
        />

        <AiDeck
          bubble={bubble}
          onRetry={retry}
          versions={Array.from({ length: versions.length }, (_, i) => ({
            label: versionMeta[i]?.label ?? (i === 0 ? FIRST_VERSION_TAG : REWRITE_VERSION_TAG),
          }))}
          currentVersion={currentVersion}
          onSelectVersion={(i) => {
            // 0⭐ instant switch — manual styles + mute survive (AC-7).
            setPinnedVersion(i);
            setBubbleOverride(null);
          }}
          hasSong={hasSong}
          busy={generation.isPending}
          onSuggestion={generateFromCard}
          selectedSlot={selectedSlot}
          styles={styles}
          onStyle={(slot, styleId) => {
            if (styles[slot] !== styleId) styleChangesRef.current += 1;
            setStyles((s) => ({ ...s, [slot]: styleId }));
            // 0⭐ instant timbre swap + 1-beat audition when idle (PRD §5).
            if (styleId !== STYLE_NONE) void playback.previewStyle(slot, styleId);
          }}
        />

        {score ? (
          <>
            <div className={clsx(drawerOpen ? 'block' : 'hidden min-[740px]:block')} data-testid="lanes-region">
              <TrackLanes
                score={score}
                playback={playback}
                styles={styles}
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
                silenced={silenced}
                onOpenMixer={() => setMixerOpen(true)}
              />
            </div>
            {mixerOpen && (
              <div className="border-t border-hairline bg-canvas-pure" data-testid="mixer-region">
                {/* Capability boundary stated, never faked (PRD §4.1 principle):
                    the legacy mini-DAW mixes REAL-AUDIO tracks only. */}
                <p className="px-5 pt-3 text-[12px] font-semibold text-slate2" data-testid="mixer-note">
                  🎚 The Mixer holds your real-audio tracks (imported + studio songs).
                  Note editing and score-track re-rolls arrive here soon!
                </p>
                <MusicTrackList
                  messages={messages}
                  onGenerateTrack={() => composerRef.current?.focus()}
                  onImportTrack={onImportTrack}
                />
              </div>
            )}
          </>
        ) : (
          hasAudioTracks && (
            <MusicTrackList
              messages={messages}
              onGenerateTrack={() => composerRef.current?.focus()}
              onImportTrack={onImportTrack}
            />
          )
        )}
      </div>

      {/* transport / exit row (PRD §2.1 bottom bar) */}
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-t border-hairline bg-canvas-pure px-5 py-3">
        <button
          type="button"
          onClick={() => (playback.isPlaying ? playbackStop() : void playbackPlay())}
          disabled={!hasSong}
          aria-label={playback.isPlaying ? 'Stop' : 'Play'}
          className="grid h-12 w-12 place-items-center rounded-full bg-grad-mint text-[18px] text-white shadow-brand-mint transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
          data-testid="stage-play"
        >
          {playback.isPlaying ? '⏹' : '▶'}
        </button>
        <div className="min-w-0 flex-1 text-[12px] leading-snug text-slate2" data-testid="now-line">
          {score ? (
            <>
              <span className="block truncate text-[14px] font-extrabold text-ink">“{score.title}”</span>
              {score.tempo} BPM · {score.key} · {fmtTime(playback.position)} / {fmtTime(playback.totalDuration)}
            </>
          ) : (
            <>
              <span className="block text-[14px] font-extrabold text-ink">No song yet</span>
              Ask the AI for one up top!
            </>
          )}
        </div>
        {score && (
          <>
            {/* PRD §2 step ⑤ — Save / Mixer exits on the transport row. */}
            <button
              type="button"
              onClick={() => save.mutate({ score, version: currentVersion })}
              disabled={save.isPending || !!savedVersions[currentVersion]}
              className="rounded-full border-2 border-hairline bg-canvas px-4 py-2 text-[13px] font-bold text-ink transition hover:border-brand-mint disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="stage-save"
            >
              {save.isPending
                ? '💾 Saving…'
                : savedVersions[currentVersion]
                  ? '✓ Saved!'
                  : '💾 Save'}
            </button>
            <button
              type="button"
              onClick={() => setMixerOpen((v) => !v)}
              aria-expanded={mixerOpen}
              className={clsx(
                'rounded-full border-2 px-4 py-2 text-[13px] font-bold transition',
                mixerOpen
                  ? 'border-brand-mint bg-wash-mint text-ink'
                  : 'border-hairline bg-canvas text-ink hover:border-brand-mint',
              )}
              data-testid="stage-mixer"
            >
              ⚙️ Mixer {mixerOpen ? '▾' : '▴'}
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen((v) => !v)}
              className="min-[740px]:hidden rounded-full border-2 border-hairline bg-canvas px-4 py-2 text-[13px] font-bold text-ink transition hover:border-brand-mint"
              data-testid="lanes-drawer-handle"
            >
              🎚 Tracks {drawerOpen ? '▾' : '▴'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
