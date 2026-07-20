// Music Stage — the studio=music opening + main interaction layer
// (music-stage-prd.md §2–§3). Replaces the form-based setup and the chat
// input for music sessions while reusing the Workspace session/message flow:
// every generation is a message pair, versions aggregate client-side.
//
// Mount with key={sessionId} — stage state (styles, versions meta, genre)
// is session-scoped by design, like the sibling setupValues.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
import {
  audioBufferToWavBlob,
  exportFilename,
  renderScore,
  triggerBlobDownload,
  type MixSnapshot,
} from './offlineRender';
import { buildRealSongPrompt, generateRealSong, REAL_SONG_COST_STARS } from './realSongApi';
import { RiffPadPanel } from './RiffPadPanel';
import {
  emptyRiff,
  riffToSeedScore,
  seedToPlayableScore,
  seedToRiffGrid,
  toggleRiffCell,
  RIFF_TEMPO,
  type RiffGrid,
  type RiffSection,
} from './riffPad';
import { requestGhostRiff, requestRiffAdvice } from './riffTutorApi';
import {
  INSTRUMENT_META,
  type InstrumentKind,
  type MusicScore,
  type StageTweaks,
  type TrackTweak,
} from './scoreTypes';
import { preloadPrograms } from './soundfont';
import { fmtTime, stepIndexAt } from './scoreUtils';
import {
  COMPOSE_FAILED_BUBBLE,
  EDIT_VERSION_TAG,
  EXPORT_FAILED_BUBBLE,
  FIRST_COMPOSE_SUBTITLE,
  FIRST_VERSION_TAG,
  GENRE_BY_ID,
  EMPTY_MARQUEE,
  INITIAL_BUBBLE,
  MUSIC_GENERATION_COST_STARS,
  REAL_SONG_DONE_BUBBLE,
  REAL_SONG_FAILED_BUBBLE,
  REWRITE_VERSION_TAG,
  RIFF_ADVICE_COST_STARS,
  RIFF_COMPOSE_SUBTITLE,
  RIFF_DEFAULT_PROMPT,
  RIFF_GHOST_COST_STARS,
  RIFF_GHOST_DEFAULT_IDEA,
  RIFF_TUTOR_FAILED_BUBBLE,
  RIFF_VERSION_TAG,
  riffTutorOutOfStarsBubble,
  rerollVersionTag,
  SAVE_FAILED_BUBBLE,
  STAGE_SLOTS,
  STYLE_NONE,
  buildAiBubble,
  buildScoreDiff,
  iterationSubtitle,
  marqueeFor,
  outOfStarsBubble,
  stageSlotFor,
  styleOf,
  type ComposeMode,
  type GenreId,
  type StageSlotId,
  type StageStyles,
  type SuggestionCard,
  type SuggestionKey,
} from './stageData';
import { aggregateScoreVersions, aggregateSeedRiff } from './versions';
import { useIsWide } from './useIsWide';
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
  classId,
  onExit,
  onImportTrack,
}: {
  sessionId: string;
  messages: Message[];
  balance: number;
  kidId: string | null;
  familyId: string | null;
  /** Set when the kid arrived via "create for class" — Save attaches the song to it. */
  classId: string | null;
  /** Immersive surface: the Learn nav bar is hidden, so the stage owns the way out. */
  onExit: () => void;
  onImportTrack: () => void;
}) {
  const qc = useQueryClient();
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState('');
  const [genre, setGenre] = useState<GenreId>('rock');
  // Once a song exists, typed text EDITS the current version by default
  // (D-MS10) — "every Compose starts over" was the exact complaint.
  const [composeMode, setComposeMode] = useState<ComposeMode>('edit');
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
  // Lane Edit-drawer tweaks (name/octave/pan) by INSTRUMENT KIND, surviving
  // version switches like mute/solo/volume (track-editing PRD §3-A, AC-8).
  const [tweaks, setTweaks] = useState<StageTweaks>({});
  // WAV export spinners (track-editing PRD §3-A/§3-C): lane index or the mix.
  const [downloadingTrack, setDownloadingTrack] = useState<number | null>(null);
  const [mixDownloadBusy, setMixDownloadBusy] = useState(false);
  // 🎧 two-step confirm — shows "The AI will hear: …" first (PRD §3-B).
  const [realConfirmOpen, setRealConfirmOpen] = useState(false);
  // The project this song lives in, once 💾 Save or 🎧 Make-it-real has minted one.
  // Both need a project (audio Artifacts require one) and must share it — otherwise
  // one song scatters across two "My Works" entries.
  const [songProjectId, setSongProjectId] = useState<string | null>(null);
  // Riff Pad (§5A D-MS11): the kid's own tapped motif — 0⭐, no AI, session-local
  // until a seeded generation persists it as the permanent frame 0.
  const [riff, setRiff] = useState(emptyRiff);
  // What the ONE playback engine is auditioning instead of the song: the live
  // pad loop, or the persisted frame-0 riff ("hear just mine"). Tone.Transport
  // is a singleton, so audition swaps the played score rather than adding a
  // second engine.
  const [audition, setAudition] = useState<'pad' | 'seed' | null>(null);
  // 👻 The tutor's faint starter underlay (§5A D-MS13) — a separate LAYER the
  // kid traces over or hides; it never becomes the kid's notes by itself.
  const [ghost, setGhost] = useState<RiffGrid | null>(null);

  const ghostMut = useMutation({
    mutationFn: (idea: string) => requestGhostRiff(idea),
    onSuccess: (res) => {
      setGhost(seedToRiffGrid(res.riff));
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
    },
    onError: (e: unknown) =>
      setBubbleOverride(
        e instanceof ApiError && !e.code.startsWith('HTTP_')
          ? friendlyError(e)
          : RIFF_TUTOR_FAILED_BUBBLE,
      ),
  });

  const adviceMut = useMutation({
    mutationFn: () => {
      const seed = riffToSeedScore(riff);
      if (!seed) throw new Error('empty riff');
      return requestRiffAdvice(seed);
    },
    onSuccess: (res) => {
      // The tutor's voice IS the AI bubble — one grounded suggestion (D-MS13).
      setBubbleOverride(res.advice);
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
    },
    onError: (e: unknown) =>
      setBubbleOverride(
        e instanceof ApiError && !e.code.startsWith('HTTP_')
          ? friendlyError(e)
          : RIFF_TUTOR_FAILED_BUBBLE,
      ),
  });

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

  // ── Riff Pad derivations (§5A D-MS11) ────────────────────────────────────
  const riffSeed = useMemo(() => riffToSeedScore(riff), [riff]);
  const riffPlayable = useMemo(() => seedToPlayableScore(riffSeed), [riffSeed]);
  // The persisted frame 0 — the riff this session's song actually grew from.
  const seedRiff = useMemo(() => aggregateSeedRiff(messages), [messages]);
  const seedPlayable = useMemo(() => seedToPlayableScore(seedRiff), [seedRiff]);
  // The one engine plays whichever score is being auditioned (pad loop /
  // frame-0 compare), else the song itself.
  const playbackScore =
    audition === 'pad' ? riffPlayable : audition === 'seed' ? seedPlayable : score;

  // Musical diff vs the previous version (§5A D-MS12) — 0⭐ template chips.
  const prevScore = currentVersion > 0 ? versions[currentVersion - 1]?.score : null;
  const diffChips = useMemo(
    () => (prevScore && score ? buildScoreDiff(prevScore, score) : []),
    [prevScore, score],
  );

  // Instruments silenced by style = None (0⭐, per stage slot — PRD §3.1/§5).
  const silenced = useMemo(() => {
    const out = new Set<InstrumentKind>();
    for (const t of score?.tracks ?? []) {
      if (styles[stageSlotFor(t.instrument)] === STYLE_NONE) out.add(t.instrument);
    }
    return out;
  }, [score, styles]);

  const playback = useScorePlayback(playbackScore, silenced, styles, tweaks);
  const { play: playbackPlay, stop: playbackStop, unlock: playbackUnlock, onPulse } = playback;

  // Audition loop: while an audition is active, (re)start playback whenever it
  // isn't running — the engine auto-stops at the score's end, so this IS the
  // loop. Leaving an audition needs no explicit stop: playbackScore swaps back
  // to the song, and the hook's rebuild-on-score-change tears the transport
  // down. Editing the riff mid-loop restarts it from the top the same way.
  useEffect(() => {
    if (audition === null || playback.isPlaying) return;
    let cancelled = false;
    void playbackUnlock().then(() => {
      if (!cancelled) return playbackPlay();
      return undefined;
    });
    return () => {
      cancelled = true;
    };
  }, [audition, playback.isPlaying, playbackUnlock, playbackPlay]);

  // The mixer state exports and the 🎧 real-song prompt must both honour —
  // one snapshot so the file the kid downloads and the song the provider
  // renders agree with what the stage plays (track-editing PRD §3-B/§3-C).
  const mixSnapshot: MixSnapshot = useMemo(
    () => ({
      muted: playback.muted,
      solo: playback.solo,
      silenced,
      volumes: playback.volumes,
      tweaks,
    }),
    [playback.muted, playback.solo, silenced, playback.volumes, tweaks],
  );

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
      saveScoreToMyWorks(args.score, classId),
    onSuccess: (res, args) => {
      setSavedVersions((m) => ({ ...m, [args.version]: true }));
      setSongProjectId(res.project_id);
      qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] });
    },
    onError: () => setBubbleOverride(SAVE_FAILED_BUBBLE),
  });

  // 🎧 "Make it real" — the score the kid wrote, rendered as actual audio by the
  // provider (music-stage-prd §2 step ⑥). The backend lands it on this session as
  // an assistant message with an audio Artifact, which is exactly what the track
  // list below already renders — so open the Mixer to show the kid where it went.
  const realSong = useMutation({
    mutationFn: (args: { score: MusicScore; topic: string | null }) =>
      generateRealSong({
        score: args.score,
        topic: args.topic,
        classId,
        projectId: songProjectId,
        mix: mixSnapshot,
      }),
    onSuccess: (res) => {
      setSongProjectId(res.project_id);
      setMixerOpen(true);
      setBubbleOverride(REAL_SONG_DONE_BUBBLE);
      qc.invalidateQueries({ queryKey: ['projects', 'kid', kidId] });
      qc.invalidateQueries({ queryKey: ['session', sessionId, 'messages'] });
      qc.invalidateQueries({ queryKey: ['kid', kidId, 'sessions'] });
      qc.invalidateQueries({ queryKey: ['wallet', familyId] });
      qc.invalidateQueries({ queryKey: ['kid', kidId, 'artifacts', 'audio'] });
    },
    onError: (e: unknown) =>
      setBubbleOverride(
        e instanceof ApiError && !e.code.startsWith('HTTP_')
          ? friendlyError(e)
          : REAL_SONG_FAILED_BUBBLE,
      ),
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
    // Only a take THIS client requested gets the "new version" choreography.
    // A passive messages update (background refetch, another device) must not
    // yank the kid off a version they pinned (AC-7).
    if (!pending && prev > 0) return;
    pendingRef.current = null;
    setVersionMeta((m) =>
      m[idx] ? m : { ...m, [idx]: pending ?? { label: idx === 0 ? FIRST_VERSION_TAG : REWRITE_VERSION_TAG } },
    );
    setPinnedVersion(null);
    setBubbleOverride(null);
    setFailed(null);
    // The take landed — clear the composer so edit mode starts with a clean
    // slate (the typed instruction was consumed, not a draft to keep). A riff
    // compose also folds the pad away: the default mode is now editing the
    // song it grew into (D-MS10), and the song owns the playback again.
    setInput('');
    setAudition(null);
    setComposeMode('edit');
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
      setAudition(null); // a generation always takes the stage back
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

  /** Composer-bar generate (D-MS10): in edit mode the typed text CHANGES the
   *  current version (the score rides the request, like a suggestion card with
   *  the kid's own words); in new mode it's a from-scratch compose. */
  const generateFromPrompt = () => {
    // Riff mode (§5A D-MS11): the kid's tapped motif IS the brief — it rides
    // the request as seedScore and the words are optional colour.
    if (composeMode === 'riff') {
      if (!riffSeed) return;
      const prompt = input.trim() || RIFF_DEFAULT_PROMPT;
      lastPromptRef.current = prompt;
      fire(
        {
          prompt,
          options: { genre: GENRE_BY_ID[genre].promptLabel },
          seedScore: riffSeed,
        },
        { label: RIFF_VERSION_TAG },
        RIFF_COMPOSE_SUBTITLE,
      );
      return;
    }
    const prompt = input.trim();
    if (!prompt) return;
    const editing = hasSong && composeMode === 'edit' && score;
    if (editing) {
      // The typed text is an INSTRUCTION ("make it faster"), not the song's
      // TOPIC — lastPromptRef stays on the original description, which the
      // 🎧 real-song prompt and the suggestion cards derive from (D-MS6).
      fire(
        { prompt, options: { genre: GENRE_BY_ID[genre].promptLabel }, existingScore: score },
        { label: EDIT_VERSION_TAG },
        iterationSubtitle(EDIT_VERSION_TAG),
      );
    } else {
      lastPromptRef.current = prompt;
      fire(
        { prompt, options: { genre: GENRE_BY_ID[genre].promptLabel } },
        { label: versions.length === 0 ? FIRST_VERSION_TAG : REWRITE_VERSION_TAG },
        FIRST_COMPOSE_SUBTITLE,
      );
    }
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

  /** Lane 🔄 (track-editing PRD §3-A): regenerate ONLY this track, −3⭐. The
   *  backend prompt builder emits the structured keep-everything-else rule. */
  const rerollTrack = (trackIndex: number) => {
    const instrument = score?.tracks[trackIndex]?.instrument;
    if (!score || !instrument) return;
    const tag = rerollVersionTag(INSTRUMENT_META[instrument]?.label ?? instrument);
    fire(
      {
        prompt: lastPromptRef.current ?? score.title,
        options: { genre: GENRE_BY_ID[genre].promptLabel },
        existingScore: score,
        rerollTrack: instrument,
      },
      { label: tag },
      iterationSubtitle(tag),
    );
  };

  /** Lane Edit drawer changes merge per instrument (name / octave / pan). */
  const applyTweak = useCallback((instrument: InstrumentKind, patch: TrackTweak) => {
    setTweaks((m) => ({ ...m, [instrument]: { ...m[instrument], ...patch } }));
  }, []);

  /** Lane ↓ (PRD §3-A): render ONE track client-side and download it. 0⭐,
   *  zero network — mute/solo are bypassed on purpose (it's a stem export). */
  const downloadTrack = async (trackIndex: number) => {
    const track = score?.tracks[trackIndex];
    if (!score || !track || downloadingTrack !== null) return;
    setDownloadingTrack(trackIndex);
    try {
      const buffer = await renderScore(score, styles, mixSnapshot, trackIndex);
      const label =
        tweaks[track.instrument]?.name?.trim() ||
        INSTRUMENT_META[track.instrument]?.label ||
        track.instrument;
      triggerBlobDownload(audioBufferToWavBlob(buffer), exportFilename(score.title, label));
    } catch {
      setBubbleOverride(EXPORT_FAILED_BUBBLE);
    } finally {
      setDownloadingTrack(null);
    }
  };

  /** Transport ↓ Song (PRD §3-C): the whole mix as the kid hears it. */
  const downloadMix = async () => {
    if (!score || mixDownloadBusy) return;
    setMixDownloadBusy(true);
    try {
      const buffer = await renderScore(score, styles, mixSnapshot);
      triggerBlobDownload(audioBufferToWavBlob(buffer), exportFilename(score.title));
    } catch {
      setBubbleOverride(EXPORT_FAILED_BUBBLE);
    } finally {
      setMixDownloadBusy(false);
    }
  };

  // Restore the song's TOPIC for suggestion cards / 🎧 on reloaded sessions.
  // FIRST user message, not the last: later user messages may be typed EDIT
  // instructions ("make it faster", D-MS10), which describe a change, not the
  // song. The original description is what recordings should be titled after.
  useEffect(() => {
    if (lastPromptRef.current) return;
    for (const m of messages) {
      if (m.role === 'user' && m.content.trim()) {
        lastPromptRef.current = m.content.trim();
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
          // Seeded story (§5A): fresh takes know their label; a reloaded
          // session falls back to "frame 0 exists and this is the first take".
          seeded:
            versionMeta[currentVersion]?.label === RIFF_VERSION_TAG ||
            (currentVersion === 0 && seedRiff !== null),
        })
      : INITIAL_BUBBLE);

  const retry = failed ? () => fire(failed.req, failed.meta, failed.subtitle) : null;
  const hasAudioTracks = useMemo(
    () => messages.some((m) => m.role === 'assistant' && m.artifact?.kind === 'audio'),
    [messages],
  );
  const activeStep =
    playback.isPlaying && score ? stepIndexAt(playback.position, score.tempo) : null;

  // ── Layout regions (music-stage-prd D-MS9) ────────────────────────────────
  // The Stage mirrors the Creative Code Studio's split-workspace skeleton: the
  // page never scrolls — the ARTIFACT (stage + lanes) owns the big right region
  // and stays on screen, the TOOLS (AI deck + composer) live in a left column
  // that scrolls internally, and the transport docks below like the Taskbar.
  const isWide = useIsWide();

  const stageView = (
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
  );

  const aiDeck = (
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
      diffChips={diffChips}
      hasSeedFrame={seedRiff !== null}
      seedAuditioning={audition === 'seed'}
      onSeedAudition={() => setAudition((a) => (a === 'seed' ? null : 'seed'))}
    />
  );

  // Riff Pad panel (§5A D-MS11) — docked above the composer while riff mode is
  // on, so "tap → loop → make it a song" reads top-to-bottom in one column.
  const riffPanel =
    composeMode === 'riff' ? (
      <RiffPadPanel
        grid={riff}
        onToggle={(section: RiffSection, row: number, step: number) =>
          setRiff((g) => toggleRiffCell(g, section, row, step))
        }
        onClear={() => {
          setRiff(emptyRiff());
          setAudition((a) => (a === 'pad' ? null : a));
        }}
        auditioning={audition === 'pad'}
        onToggleAudition={() => setAudition((a) => (a === 'pad' ? null : 'pad'))}
        activeStep={
          audition === 'pad' && playback.isPlaying
            ? stepIndexAt(playback.position, RIFF_TEMPO)
            : null
        }
        ghost={ghost}
        onGhost={() => {
          // AC-8 discipline: an unaffordable click never reaches the backend.
          if (balance < RIFF_GHOST_COST_STARS) {
            setBubbleOverride(riffTutorOutOfStarsBubble(RIFF_GHOST_COST_STARS, balance));
            return;
          }
          ghostMut.mutate(input.trim() || RIFF_GHOST_DEFAULT_IDEA);
        }}
        onDismissGhost={() => setGhost(null)}
        ghostBusy={ghostMut.isPending}
        onAdvice={() => {
          if (balance < RIFF_ADVICE_COST_STARS) {
            setBubbleOverride(riffTutorOutOfStarsBubble(RIFF_ADVICE_COST_STARS, balance));
            return;
          }
          adviceMut.mutate();
        }}
        adviceBusy={adviceMut.isPending}
      />
    ) : null;

  // ⚙️ Mixer / pre-song imported tracks — the real-audio track list, shown in
  // the deck column under the AI conversation (never a page-level section).
  const trackListRegion = score ? (
    mixerOpen && (
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
    )
  ) : (
    hasAudioTracks && (
      <MusicTrackList
        messages={messages}
        onGenerateTrack={() => composerRef.current?.focus()}
        onImportTrack={onImportTrack}
      />
    )
  );

  // The composer docks at the BOTTOM of the deck column — the chat idiom the
  // Creative Code Studio's ChatPane uses (conversation above, input below).
  const composerDock = (
    <ComposerBar
      value={input}
      onChange={setInput}
      genre={genre}
      onGenre={setGenre}
      onGenerate={generateFromPrompt}
      busy={generation.isPending}
      balance={balance}
      hasSong={hasSong}
      mode={composeMode}
      onMode={setComposeMode}
      riffEmpty={riffSeed === null}
      inputRef={composerRef}
    />
  );

  const trackLanes = score ? (
    <TrackLanes
      score={score}
      playback={playback}
      styles={styles}
      selectedSlot={selectedSlot}
      onSelectSlot={setSelectedSlot}
      silenced={silenced}
      tweaks={tweaks}
      onTweak={applyTweak}
      onDownloadTrack={(idx) => void downloadTrack(idx)}
      onReroll={rerollTrack}
      downloadingTrack={downloadingTrack}
    />
  ) : null;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-canvas" data-testid="music-stage-pane">
      {isWide ? (
        // ≥740px: side-by-side studio split (deck left, stage + lanes right).
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <PanelGroup direction="horizontal" className="h-full min-h-0" autoSaveId="music-stage-split">
            <Panel defaultSize={36} minSize={26} className="min-w-0">
              <section className="flex h-full min-h-0 flex-col bg-canvas-pure" data-testid="stage-deck">
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {aiDeck}
                  {trackListRegion}
                </div>
                {riffPanel}
                {composerDock}
              </section>
            </Panel>
            <PanelResizeHandle className="group relative flex w-2 shrink-0 items-stretch justify-center bg-transparent outline-none">
              <span className="w-0.5 rounded bg-hairline transition-colors group-hover:bg-brand-mint group-data-[resize-handle-state=drag]:bg-brand-mint" />
            </PanelResizeHandle>
            <Panel defaultSize={64} minSize={40} className="min-w-0">
              <div className="flex h-full min-h-0 flex-col">
                <div className="min-h-0 flex-1">{stageView}</div>
                {trackLanes && (
                  <div
                    className="max-h-[45%] shrink-0 overflow-y-auto border-t border-hairline"
                    data-testid="lanes-region"
                  >
                    {trackLanes}
                  </div>
                )}
              </div>
            </Panel>
          </PanelGroup>
        </div>
      ) : (
        // <740px: stacked column — stage up top (fixed height via stage.css),
        // everything else scrolls in the middle: a phone hasn't the height to
        // dock the composer too, so it leads the scroll (step ① reading order)
        // and only the stage + transport stay pinned.
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0">{stageView}</div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-canvas-pure">
            {riffPanel}
            {composerDock}
            {aiDeck}
            {trackListRegion}
            {trackLanes && (
              <div
                className={clsx('border-t border-hairline', drawerOpen ? 'block' : 'hidden')}
                data-testid="lanes-region"
              >
                {trackLanes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* transport / exit row (PRD §2.1 bottom bar) */}
      <div className="flex shrink-0 flex-wrap items-center gap-4 border-t border-hairline bg-canvas-pure px-5 py-3">
        {/* The nav bar is hidden on this immersive surface (D-MS7), so the way
            out lives here — a kid must never be trapped on the stage. */}
        <button
          type="button"
          onClick={onExit}
          aria-label="Back to Learn"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-hairline bg-canvas text-[18px] text-ink transition hover:border-brand-mint"
          data-testid="stage-exit"
        >
          ←
        </button>
        {/* Airbotix brand mark + surface name — the immersive page hides the
            Learn nav (D-MS7), so the brand rides the transport bar exactly like
            the playground's Taskbar. Hidden on narrow screens (the row is tight). */}
        <div className="hidden shrink-0 items-center gap-2.5 min-[900px]:flex" data-testid="stage-brand">
          <img
            src="/logo-black-horizontal.png"
            alt="Airbotix"
            draggable={false}
            className="h-6 w-auto select-none"
          />
          <span aria-hidden className="h-5 w-px bg-hairline" />
          <span className="text-[13px] font-bold text-slate2">Music Stage</span>
        </div>
        {import.meta.env.DEV && (
          // Local stacks run the deterministic mock LLM (DEEPROUTER_USE_MOCK):
          // freeform edits return the SAME fixture song, which reads as "the AI
          // ignored me". Name it, DEV builds only (track-editing PRD §4).
          <span
            className="hidden shrink-0 rounded-full bg-wash-sunshine px-2.5 py-1 text-[10px] font-bold text-ink min-[900px]:inline"
            title="Local dev stacks use a fake AI — edit instructions may return the same song every time. Production uses the real AI."
            data-testid="dev-mock-note"
          >
            DEV · fake AI
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            if (playback.isPlaying) {
              // Stopping also leaves any audition — otherwise the audition
              // loop would immediately restart what the kid just stopped.
              setAudition(null);
              playbackStop();
            } else {
              void playbackPlay();
            }
          }}
          disabled={!hasSong && !playbackScore}
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
            // One instruction only — the composer bar up top already says
            // "① Tell the AI what song you want". Repeating it here (and in the
            // stage hint, and in the AI bubble) filled the screen with the same
            // sentence four times.
            <span className="block text-[14px] font-extrabold text-ink">No song yet</span>
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
            {/* ↓ Song — the whole mix, rendered client-side (0⭐, PRD §3-C). */}
            <button
              type="button"
              onClick={() => void downloadMix()}
              disabled={mixDownloadBusy}
              title="Download your song as an audio file"
              className="rounded-full border-2 border-hairline bg-canvas px-4 py-2 text-[13px] font-bold text-ink transition hover:border-brand-mint disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="stage-download-mix"
            >
              {mixDownloadBusy ? '↓ Rendering…' : '↓ Song'}
            </button>
            {/* PRD §2 step ⑥ — the score the kid wrote, recorded for real by the
                audio provider. Star-gated like composing (AC-8): an unaffordable
                click must never reach the backend. Two-step: the confirm shows
                exactly what the AI will hear, mix included (PRD §3-B). */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setRealConfirmOpen((v) => !v)}
                disabled={realSong.isPending || balance < REAL_SONG_COST_STARS}
                title={
                  balance < REAL_SONG_COST_STARS
                    ? `Need ${REAL_SONG_COST_STARS}★, have ${balance}★`
                    : 'Record this song for real'
                }
                aria-expanded={realConfirmOpen}
                className="rounded-full border-2 border-hairline bg-canvas px-4 py-2 text-[13px] font-bold text-ink transition hover:border-brand-mint disabled:cursor-not-allowed disabled:opacity-60"
                data-testid="stage-real-song"
              >
                {realSong.isPending ? '🎧 Recording…' : `🎧 Make it real −${REAL_SONG_COST_STARS}⭐`}
              </button>
              {realConfirmOpen && !realSong.isPending && (
                <div
                  className="absolute bottom-full right-0 z-30 mb-2 w-72 rounded-xl border border-hairline bg-canvas-pure p-3 shadow-lg"
                  data-testid="real-song-confirm"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate2">
                    The AI will hear
                  </p>
                  <p className="mt-1 text-[12px] font-semibold leading-snug text-ink" data-testid="real-song-prompt-preview">
                    “{buildRealSongPrompt(score, lastPromptRef.current ?? undefined, mixSnapshot)}”
                  </p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setRealConfirmOpen(false)}
                      className="rounded-full border-2 border-hairline bg-canvas px-3 py-1 text-[12px] font-bold text-ink transition hover:border-brand-coral"
                      data-testid="real-song-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRealConfirmOpen(false);
                        realSong.mutate({ score, topic: lastPromptRef.current });
                      }}
                      className="rounded-full bg-grad-mint px-3 py-1 text-[12px] font-bold text-white shadow-brand-mint transition hover:scale-105"
                      data-testid="real-song-confirm-go"
                    >
                      Record −{REAL_SONG_COST_STARS}⭐
                    </button>
                  </div>
                </div>
              )}
            </div>
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
