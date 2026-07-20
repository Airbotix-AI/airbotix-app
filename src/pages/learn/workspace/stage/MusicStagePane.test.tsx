// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import type { Message } from '../WorkspacePage';
import type { MusicScore } from './scoreTypes';

const {
  playbackMock,
  generateMusicScoreMock,
  preloadProgramsMock,
  saveScoreToMyWorksMock,
  generateRealSongMock,
  renderScoreMock,
  triggerBlobDownloadMock,
} = vi.hoisted(() => ({
  playbackMock: {
    isPlaying: false,
    position: 0,
    totalDuration: 8,
    play: vi.fn(async () => {}),
    stop: vi.fn(),
    unlock: vi.fn(async () => {}),
    muted: {} as Record<string, boolean>,
    toggleMute: vi.fn(),
    solo: null as string | null,
    toggleSolo: vi.fn(),
    volumes: {} as Record<string, number>,
    setVolume: vi.fn(),
    onPulse: vi.fn(() => () => {}),
    previewStyle: vi.fn(async () => {}),
  },
  generateMusicScoreMock: vi.fn(),
  preloadProgramsMock: vi.fn(),
  saveScoreToMyWorksMock: vi.fn(),
  generateRealSongMock: vi.fn(),
  renderScoreMock: vi.fn(),
  triggerBlobDownloadMock: vi.fn(),
}));

vi.mock('./useScorePlayback', () => ({
  useScorePlayback: () => playbackMock,
}));
vi.mock('./musicScoreApi', () => ({
  generateMusicScore: generateMusicScoreMock,
  saveScoreToMyWorks: saveScoreToMyWorksMock,
}));
vi.mock('./realSongApi', async (orig) => ({
  // Keep the real prompt/length derivation (covered in realSongApi.test) and stub
  // only the network call.
  ...(await orig<typeof import('./realSongApi')>()),
  generateRealSong: generateRealSongMock,
}));
// smplr layer is exercised in soundfont.test.ts — here only the preload call.
vi.mock('./soundfont', () => ({
  preloadPrograms: preloadProgramsMock,
}));
// Offline WAV rendering needs a real AudioContext — stub the render + the
// download hand-off, keep the pure helpers (filenames, audibility) real.
vi.mock('./offlineRender', async (orig) => ({
  ...(await orig<typeof import('./offlineRender')>()),
  renderScore: renderScoreMock,
  audioBufferToWavBlob: () => new Blob(),
  triggerBlobDownload: triggerBlobDownloadMock,
}));
// Legacy audio-artifact fallback pulls in wavesurfer — irrelevant here.
vi.mock('../MusicTrackList', () => ({
  MusicTrackList: () => <div data-testid="legacy-track-list" />,
}));

import { MusicStagePane } from './MusicStagePane';

const SCORE_V1: MusicScore = {
  title: 'Space Pup',
  tempo: 118,
  key: 'D minor',
  genre: 'rock',
  tracks: [
    { instrument: 'guitar',   notes: [{ time: 0, note: 'E3', duration: '8n' }] },
    { instrument: 'bass',     notes: [{ time: 0, note: 'E2', duration: '4n' }] },
    { instrument: 'drums',    notes: [{ time: 0, note: 'kick', duration: '8n' }] },
    { instrument: 'piano',    notes: [{ time: 1, note: 'C4', duration: '4n' }] },
    { instrument: 'keyboard', notes: [{ time: 2, note: 'G4', duration: '2n' }] },
  ],
};
const SCORE_V2: MusicScore = { ...SCORE_V1, title: 'Space Pup II', tempo: 126 };
// Extra tracks beyond the 5 stage instruments still get their own lane and
// pulse the nearest stage slot (percussion→drums, strings→piano) — PRD §4.
const SCORE_EXTRA: MusicScore = {
  ...SCORE_V1,
  title: 'Big Band Pup',
  tracks: [
    ...SCORE_V1.tracks,
    { instrument: 'percussion', notes: [{ time: 0, note: 'clap', duration: '16n' }] },
    { instrument: 'strings',    notes: [{ time: 0, note: 'A3', duration: '2n' }] },
  ],
};

let nextId = 0;
function userMsg(content: string): Message {
  nextId += 1;
  return {
    id: `u${nextId}`,
    role: 'user',
    tool: 'music',
    content,
    artifact_id: null,
    stars_charged: 3,
    created_at: new Date().toISOString(),
    artifact: null,
  };
}
// The REAL workspace shape (free-play, no project): the backend inlines the
// score on the session message itself — there is no Artifact row at all
// (music-stage-prd §3.5). Versions must aggregate from message metadata.
function scoreMsg(score: MusicScore): Message {
  nextId += 1;
  return {
    id: `m${nextId}`,
    role: 'assistant',
    tool: 'music',
    content: `Composed "${score.title}" · ${score.tempo}bpm · ${score.tracks.length} instruments`,
    artifact_id: null,
    stars_charged: 3,
    created_at: new Date().toISOString(),
    metadata: { score },
    artifact: null,
  };
}

function renderPane(messages: Message[], balance = 50, classId: string | null = null) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MusicStagePane
        sessionId="s1"
        messages={messages}
        balance={balance}
        kidId="k1"
        familyId="f1"
        classId={classId}
        onExit={() => {}}
        onImportTrack={() => {}}
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // clearAllMocks only resets the fns — restore the mutable playback state too.
  playbackMock.isPlaying = false;
  playbackMock.position = 0;
  playbackMock.muted = {};
  playbackMock.solo = null;
  playbackMock.volumes = {};
});

afterEach(cleanup);

describe('MusicStagePane — empty stage (AC-1)', () => {
  it('dims the band, disables play, keeps the composer usable', () => {
    renderPane([]);
    expect(screen.getByTestId('music-stage')).toHaveClass('is-empty');
    // ONE instruction on an empty stage. The hint used to carry a second line
    // repeating the composer bar, the AI bubble repeated it again, and so did the
    // transport row — four copies of "describe a song up top" around a stage whose
    // band you could not see (D-MS7).
    expect(screen.getByTestId('stage-empty-hint')).toHaveTextContent('Your band is waiting for a song');
    expect(screen.getByTestId('stage-empty-hint')).not.toHaveTextContent('up top');
    expect(screen.getByTestId('now-line')).not.toHaveTextContent('up top');
    expect(screen.getByTestId('ai-bubble')).not.toHaveTextContent('Describe your song up top');
    expect(screen.getByTestId('stage-play')).toBeDisabled();
    expect(screen.getByTestId('stage-inst-guitar')).toBeDisabled();
    expect(screen.getByTestId('composer-input')).toBeEnabled();
    expect(screen.getByTestId('ai-bubble')).toHaveTextContent('band conductor');
    // The kid must never be trapped: this surface hides the Learn nav bar.
    expect(screen.getByTestId('stage-exit')).toBeInTheDocument();
    expect(screen.queryByTestId('track-lanes')).not.toBeInTheDocument();
    expect(screen.queryByTestId('suggestion-row')).not.toBeInTheDocument();
  });
});

describe('MusicStagePane — Stars guard (AC-8)', () => {
  it('never sends the request when balance < 3⭐ and explains why', () => {
    renderPane([], 2);
    fireEvent.change(screen.getByTestId('composer-input'), {
      target: { value: 'a space puppy adventure' },
    });
    fireEvent.click(screen.getByTestId('composer-generate'));
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('ai-bubble')).toHaveTextContent('Not enough Stars');
    expect(screen.queryByTestId('stage-composing')).not.toBeInTheDocument();
  });
});

describe('MusicStagePane — generation', () => {
  it('shows the composing overlay (real wait, no fake progress) while pending', async () => {
    generateMusicScoreMock.mockReturnValue(new Promise(() => {}));
    renderPane([]);
    fireEvent.change(screen.getByTestId('composer-input'), {
      target: { value: 'a space puppy adventure' },
    });
    fireEvent.click(screen.getByTestId('composer-generate'));
    expect(await screen.findByTestId('stage-composing')).toHaveTextContent(
      'Hearing your idea — picking a key, writing the melody, laying the beat',
    );
    expect(generateMusicScoreMock).toHaveBeenCalledWith({
      prompt: 'a space puppy adventure',
      options: { genre: 'Rock' },
    });
    expect(playbackMock.unlock).toHaveBeenCalled();
  });

  it('warms the soundfont cache for the genre preset styles while composing (§6.1)', async () => {
    generateMusicScoreMock.mockReturnValue(new Promise(() => {}));
    renderPane([]);
    fireEvent.change(screen.getByTestId('composer-input'), {
      target: { value: 'a space puppy adventure' },
    });
    fireEvent.click(screen.getByTestId('composer-generate'));
    await screen.findByTestId('stage-composing');
    // Rock preset: Crunch 29 / Picked 34 / Rock Kit 0 / Grand 1 / Organ 17.
    expect(preloadProgramsMock).toHaveBeenCalledWith([29, 34, 0, 1, 17]);
  });

  // D-MS10: with a song on stage the composer defaults to EDIT mode — typed
  // text CHANGES the current version (existingScore rides, no card modifier).
  it('typed text edits the CURRENT song by default (existingScore, no modifier)', async () => {
    generateMusicScoreMock.mockReturnValue(new Promise(() => {}));
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    expect(screen.getByTestId('compose-mode-edit')).toHaveAttribute('aria-selected', 'true');
    // Edit mode clears the new-song helpers so the textarea gets the room.
    expect(screen.queryByTestId('idea-chip-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('genre-rock')).not.toBeInTheDocument();
    fireEvent.change(screen.getByTestId('composer-input'), {
      target: { value: 'make the piano sadder' },
    });
    fireEvent.click(screen.getByTestId('composer-generate'));
    await waitFor(() =>
      expect(generateMusicScoreMock).toHaveBeenCalledWith({
        prompt: 'make the piano sadder',
        options: { genre: 'Rock' },
        existingScore: SCORE_V1,
      }),
    );
  });

  it('"✨ New song" mode composes from scratch (no existingScore) and brings the helpers back', async () => {
    generateMusicScoreMock.mockReturnValue(new Promise(() => {}));
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('compose-mode-new'));
    expect(screen.getByTestId('idea-chip-0')).toBeInTheDocument();
    expect(screen.getByTestId('genre-rock')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('composer-input'), {
      target: { value: 'a totally different song' },
    });
    fireEvent.click(screen.getByTestId('composer-generate'));
    await waitFor(() =>
      expect(generateMusicScoreMock).toHaveBeenCalledWith({
        prompt: 'a totally different song',
        options: { genre: 'Rock' },
      }),
    );
  });

  it('sends the CANONICAL structured modifier + existingScore for suggestion cards (AC-4)', async () => {
    generateMusicScoreMock.mockResolvedValue({
      score: SCORE_V2,
      stars_charged: 3,
      balance_after: 9,
      artifact_id: null,
      session_id: 's1',
    });
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('suggestion-energy+1'));
    await waitFor(() =>
      expect(generateMusicScoreMock).toHaveBeenCalledWith({
        prompt: 'a space puppy adventure',
        options: { genre: 'Rock' },
        modifier: 'energy+1',
        existingScore: SCORE_V1,
      }),
    );
  });

  it('re-rolls from scratch for 🎲 Surprise me — same prompt, no existingScore (AC-3)', async () => {
    generateMusicScoreMock.mockResolvedValue({
      score: SCORE_V2,
      stars_charged: 3,
      balance_after: 9,
      artifact_id: null,
      session_id: 's1',
    });
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('suggestion-surprise'));
    await waitFor(() =>
      expect(generateMusicScoreMock).toHaveBeenCalledWith({
        prompt: 'a space puppy adventure',
        options: { genre: 'Rock' },
        modifier: 'surprise',
      }),
    );
  });

  it('surfaces kid-friendly errors with a retry (AC-10 firewall path)', async () => {
    generateMusicScoreMock.mockRejectedValue(
      new ApiError(422, 'FIREWALL_BLOCKED', 'Let’s keep songs friendly!'),
    );
    renderPane([userMsg('something naughty'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('suggestion-drums+'));
    expect(await screen.findByTestId('bubble-retry')).toBeInTheDocument();
    expect(screen.getByTestId('ai-bubble')).toHaveTextContent('Let’s keep songs friendly!');
    fireEvent.click(screen.getByTestId('bubble-retry'));
    await waitFor(() => expect(generateMusicScoreMock).toHaveBeenCalledTimes(2));
  });
});

describe('MusicStagePane — style_changes audit counter (PRD §8)', () => {
  const OK_RESULT = {
    score: SCORE_V2,
    stars_charged: 3,
    balance_after: 9,
    artifact_id: null,
    session_id: 's1',
  };

  it('counts 0⭐ switches since the last generation and rides the request', async () => {
    generateMusicScoreMock.mockResolvedValue(OK_RESULT);
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    // Two real switches + one no-op re-click of the already-active style.
    fireEvent.click(screen.getByTestId('stage-inst-keys'));
    fireEvent.click(screen.getByTestId('style-keys-ep'));
    fireEvent.click(screen.getByTestId('style-keys-ep')); // same style — not a switch
    fireEvent.click(screen.getByTestId('stage-inst-drums'));
    fireEvent.click(screen.getByTestId('style-drums-none'));
    fireEvent.click(screen.getByTestId('suggestion-energy+1'));
    await waitFor(() =>
      expect(generateMusicScoreMock).toHaveBeenCalledWith(
        expect.objectContaining({ style_changes: 2 }),
      ),
    );
  });

  it('resets the counter after a successful generation', async () => {
    generateMusicScoreMock.mockResolvedValue(OK_RESULT);
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('stage-inst-keys'));
    fireEvent.click(screen.getByTestId('style-keys-ep'));
    fireEvent.click(screen.getByTestId('suggestion-energy+1'));
    await waitFor(() => expect(generateMusicScoreMock).toHaveBeenCalledTimes(1));
    expect(generateMusicScoreMock.mock.calls[0][0]).toMatchObject({ style_changes: 1 });
    // Next generation without further switches: counter back to zero — the
    // field is omitted entirely (the backend audit defaults it to 0).
    fireEvent.click(screen.getByTestId('suggestion-drums+'));
    await waitFor(() => expect(generateMusicScoreMock).toHaveBeenCalledTimes(2));
    expect(generateMusicScoreMock.mock.calls[1][0]).not.toHaveProperty('style_changes');
  });

  it('omits the field when no switch happened since the last generation', async () => {
    generateMusicScoreMock.mockResolvedValue(OK_RESULT);
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('suggestion-energy+1'));
    await waitFor(() => expect(generateMusicScoreMock).toHaveBeenCalledTimes(1));
    expect(generateMusicScoreMock.mock.calls[0][0]).not.toHaveProperty('style_changes');
  });
});

describe('MusicStagePane — Save to My Works + Mixer (PRD §2 step ⑤)', () => {
  it('hides Save/Mixer while the stage is empty', () => {
    renderPane([]);
    expect(screen.queryByTestId('stage-save')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stage-mixer')).not.toBeInTheDocument();
  });

  it('promotes the CURRENT version score through the artifact flow and marks it saved', async () => {
    saveScoreToMyWorksMock.mockResolvedValue({ project_id: 'p1', artifact_id: 'a1' });
    renderPane([
      userMsg('a space puppy adventure'),
      scoreMsg(SCORE_V1),
      userMsg('surprise me'),
      scoreMsg(SCORE_V2),
    ]);
    // Pin v1 — Save must send the PINNED version, not the latest.
    fireEvent.click(screen.getByTestId('version-pill-0'));
    fireEvent.click(screen.getByTestId('stage-save'));
    // 2nd arg = the class to attach to; null when the kid opened the Stage alone.
    await waitFor(() => expect(saveScoreToMyWorksMock).toHaveBeenCalledWith(SCORE_V1, null));
    expect(await screen.findByTestId('stage-save')).toHaveTextContent('Saved');
    expect(screen.getByTestId('stage-save')).toBeDisabled();
    // The other version is its own work — still saveable.
    fireEvent.click(screen.getByTestId('version-pill-1'));
    expect(screen.getByTestId('stage-save')).toBeEnabled();
    expect(screen.getByTestId('stage-save')).toHaveTextContent('Save');
  });

  it('explains a failed save in the AI bubble and lets the kid retry', async () => {
    saveScoreToMyWorksMock.mockRejectedValue(new Error('network down'));
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('stage-save'));
    await waitFor(() =>
      expect(screen.getByTestId('ai-bubble')).toHaveTextContent("couldn't save"),
    );
    expect(screen.getByTestId('stage-save')).toBeEnabled(); // retryable
  });

  it('⚙️ Mixer toggles the legacy MusicTrackList region with its capability note', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    expect(screen.queryByTestId('mixer-region')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('stage-mixer'));
    const region = screen.getByTestId('mixer-region');
    expect(region).toBeInTheDocument();
    expect(screen.getByTestId('mixer-note')).toHaveTextContent('real-audio tracks');
    expect(screen.getByTestId('legacy-track-list')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('stage-mixer'));
    expect(screen.queryByTestId('mixer-region')).not.toBeInTheDocument();
  });
});

describe('MusicStagePane — with a song (AC-2 render)', () => {
  it('renders a project-scoped score carried on the artifact (fallback path)', () => {
    nextId += 1;
    const artifactScoreMsg: Message = {
      id: `m${nextId}`,
      role: 'assistant',
      tool: 'music',
      content: 'Here is your song!',
      artifact_id: `a${nextId}`,
      stars_charged: 3,
      created_at: new Date().toISOString(),
      artifact: {
        id: `a${nextId}`,
        kind: 'text',
        mime_type: 'application/vnd.airbotix.score+json',
        s3_key: `score/${nextId}.json`,
        project_id: 'p1',
        metadata: { score: SCORE_V1 },
      },
    };
    renderPane([userMsg('a space puppy adventure'), artifactScoreMsg]);
    expect(screen.getByTestId('music-stage')).not.toHaveClass('is-empty');
    expect(screen.getByTestId('now-line')).toHaveTextContent('Space Pup');
  });

  it('lights the stage, explains the song in the AI bubble and renders one lane per track', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    expect(screen.getByTestId('music-stage')).not.toHaveClass('is-empty');
    const bubble = screen.getByTestId('ai-bubble');
    expect(bubble).toHaveTextContent('Space Pup');
    expect(bubble).toHaveTextContent('118 BPM');
    expect(bubble).toHaveTextContent('D minor');
    expect(screen.getByTestId('stage-marquee')).toHaveTextContent('ROCK ★ LIVE');
    expect(screen.getByTestId('stage-play')).toBeEnabled();
    // 5 suggestion cards, no version row yet (single version)
    expect(screen.getByTestId('suggestion-row').querySelectorAll('button')).toHaveLength(5);
    expect(screen.queryByTestId('version-row')).not.toBeInTheDocument();
    // one lane per generated track, piano-rolls non-empty (AC-9 frontend half)
    for (let i = 0; i < SCORE_V1.tracks.length; i++) {
      expect(screen.getByTestId(`lane-${i}`)).toBeInTheDocument();
    }
    expect(screen.getAllByTestId('piano-roll')).toHaveLength(SCORE_V1.tracks.length);
  });
});

describe('MusicStagePane — versions (AC-7)', () => {
  it('switches versions for 0⭐ and keeps manual instrument styles', async () => {
    renderPane([
      userMsg('a space puppy adventure'),
      scoreMsg(SCORE_V1),
      userMsg('surprise me'),
      scoreMsg(SCORE_V2),
    ]);
    // Latest version wins by default.
    expect(screen.getByTestId('now-line')).toHaveTextContent('Space Pup II');
    expect(screen.getByTestId('version-pill-0')).toHaveTextContent('v1');
    expect(screen.getByTestId('version-pill-1')).toHaveTextContent('v2');

    // Kid restyles the keyboard (0⭐)…
    fireEvent.click(screen.getByTestId('stage-inst-keys'));
    fireEvent.click(screen.getByTestId('style-keys-ep'));
    expect(screen.getByTestId('stage-style-keys')).toHaveTextContent('Dreamy EP');

    // …then hops back to v1: score swaps, style choice survives.
    fireEvent.click(screen.getByTestId('version-pill-0'));
    await waitFor(() =>
      expect(screen.getByTestId('now-line')).toHaveTextContent('Space Pup'),
    );
    expect(screen.getByTestId('now-line')).not.toHaveTextContent('Space Pup II');
    expect(screen.getByTestId('stage-style-keys')).toHaveTextContent('Dreamy EP');
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
  });

  it('previews the fresh style for one beat and syncs stage tag + lane name (AC-5)', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('stage-inst-keys'));
    fireEvent.click(screen.getByTestId('style-keys-ep'));
    // 0⭐: timbre swap + audition, never a generation request.
    expect(playbackMock.previewStyle).toHaveBeenCalledWith('keys', 'ep');
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('stage-style-keys')).toHaveTextContent('Dreamy EP');
    // keyboard is track index 4 — its lane shows the same style name.
    expect(screen.getByTestId('lane-style-4')).toHaveTextContent('Dreamy EP');
  });

  it('does not audition style = None', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('stage-inst-drums'));
    fireEvent.click(screen.getByTestId('style-drums-none'));
    expect(playbackMock.previewStyle).not.toHaveBeenCalled();
  });

  it('marks style = None as an off (dimmed) instrument on stage', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('stage-inst-drums'));
    fireEvent.click(screen.getByTestId('style-drums-none'));
    expect(screen.getByTestId('stage-inst-drums')).toHaveClass('is-off');
    expect(screen.getByTestId('stage-style-drums')).toHaveTextContent('None');
  });
});

describe('MusicStagePane — Track Lanes (PRD §4)', () => {
  it('renders one lane per track, extras included, with non-empty piano-rolls (AC-9)', () => {
    renderPane([userMsg('a big band adventure'), scoreMsg(SCORE_EXTRA)]);
    expect(screen.getAllByTestId(/^lane-\d+$/)).toHaveLength(SCORE_EXTRA.tracks.length);
    const rolls = screen.getAllByTestId('piano-roll');
    expect(rolls).toHaveLength(SCORE_EXTRA.tracks.length);
    for (const roll of rolls) {
      expect(roll.childElementCount).toBeGreaterThan(0);
    }
    // Extra tracks keep their own identity in the lane header…
    expect(screen.getByTestId('lane-select-5')).toHaveTextContent('Percussion');
    expect(screen.getByTestId('lane-select-6')).toHaveTextContent('Strings');
  });

  it('lane click selects the mapped stage slot — extras go to the nearest instrument', () => {
    renderPane([userMsg('a big band adventure'), scoreMsg(SCORE_EXTRA)]);
    // strings → piano slot: both the strings lane and the piano lane highlight.
    fireEvent.click(screen.getByTestId('lane-select-6'));
    expect(screen.getByTestId('lane-6')).toHaveClass('bg-wash-sunshine/40');
    expect(screen.getByTestId('lane-3')).toHaveClass('bg-wash-sunshine/40');
    expect(screen.getByTestId('lane-0')).not.toHaveClass('bg-wash-sunshine/40');
  });

  it('lane [M] mutes by instrument (0⭐) and forwards to the shared playback state', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('lane-mute-2'));
    expect(playbackMock.toggleMute).toHaveBeenCalledWith('drums');
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
  });

  it('a muted lane dims its stage instrument in sync (AC-6)', () => {
    playbackMock.muted = { drums: true };
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    expect(screen.getByTestId('stage-inst-drums')).toHaveClass('is-off');
    expect(screen.getByTestId('stage-inst-guitar')).not.toHaveClass('is-off');
  });

  it('solo on one lane dims every other stage instrument (AC-6)', () => {
    playbackMock.solo = 'guitar';
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    expect(screen.getByTestId('stage-inst-guitar')).not.toHaveClass('is-off');
    expect(screen.getByTestId('stage-inst-drums')).toHaveClass('is-off');
    expect(screen.getByTestId('stage-inst-piano')).toHaveClass('is-off');
  });

  it('VOL slider forwards 0–1 values to the playback channel (0⭐)', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.change(screen.getByTestId('lane-vol-1'), { target: { value: '0.4' } });
    expect(playbackMock.setVolume).toHaveBeenCalledWith('bass', 0.4);
  });

  it('lights the currently-sounding notes while playing', () => {
    playbackMock.isPlaying = true;
    playbackMock.position = 0.1; // inside the three time-0 notes @118 BPM
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    expect(document.querySelectorAll('[data-note-active="true"]')).toHaveLength(3);
  });

  // Track-editing PRD §3-A: the ⋯ actions ACT — no more shell entries that
  // just opened the legacy Mixer region ("调整编辑" owner feedback 2026-07-17).
  it('⋯ Edit opens the drawer; name / octave / pan apply per instrument (0⭐)', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('lane-menu-btn-0'));
    fireEvent.click(screen.getByTestId('lane-menu-edit-0'));
    expect(screen.queryByTestId('lane-menu-0')).not.toBeInTheDocument(); // menu closes
    const drawer = screen.getByTestId('lane-edit-drawer-0');
    expect(drawer).toBeInTheDocument();
    // Rename shows on the lane label immediately (metadata only).
    fireEvent.change(screen.getByTestId('lane-edit-name-0'), { target: { value: 'Lead Axe' } });
    expect(screen.getByTestId('lane-name-0')).toHaveTextContent('Lead Axe');
    // Octave + pan sliders are live; zero generation calls (0⭐ layer).
    fireEvent.change(screen.getByTestId('lane-edit-octave-0'), { target: { value: '1' } });
    fireEvent.change(screen.getByTestId('lane-edit-pan-0'), { target: { value: '-0.5' } });
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('lane-edit-done-0'));
    expect(screen.queryByTestId('lane-edit-drawer-0')).not.toBeInTheDocument();
  });

  it('hides the octave control on the drums lane (hit names have no pitch)', () => {
    renderPane([scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('lane-menu-btn-2')); // drums lane
    fireEvent.click(screen.getByTestId('lane-menu-edit-2'));
    expect(screen.getByTestId('lane-edit-drawer-2')).toBeInTheDocument();
    expect(screen.queryByTestId('lane-edit-octave-2')).not.toBeInTheDocument();
    expect(screen.getByTestId('lane-edit-pan-2')).toBeInTheDocument();
  });

  it('⋯ Download renders the ONE track client-side — zero network, zero stars (AC-2)', async () => {
    renderScoreMock.mockResolvedValue({});
    renderPane([scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('lane-menu-btn-0'));
    fireEvent.click(screen.getByTestId('lane-menu-download-0'));
    await waitFor(() => expect(triggerBlobDownloadMock).toHaveBeenCalledTimes(1));
    // renderScore got the stem index; the file is named song-track.wav.
    expect(renderScoreMock.mock.calls[0][3]).toBe(0);
    expect(triggerBlobDownloadMock.mock.calls[0][1]).toBe('space-pup-guitar.wav');
    // No LLM/star call rode along (parent PRD AC-11).
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
    expect(generateRealSongMock).not.toHaveBeenCalled();
  });

  it('⋯ Re-roll fires ONE generation with the structured rerollTrack (−3⭐, AC-3)', async () => {
    generateMusicScoreMock.mockResolvedValue({
      score: SCORE_V2,
      stars_charged: 3,
      balance_after: 9,
      artifact_id: null,
      session_id: 's1',
    });
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('lane-menu-btn-2')); // drums lane
    fireEvent.click(screen.getByTestId('lane-menu-reroll-2'));
    await waitFor(() => expect(generateMusicScoreMock).toHaveBeenCalledTimes(1));
    expect(generateMusicScoreMock.mock.calls[0][0]).toMatchObject({
      prompt: 'a space puppy adventure',
      existingScore: SCORE_V1,
      rerollTrack: 'drums',
    });
  });

  it('never fires an unaffordable re-roll (AC-8)', () => {
    renderPane([scoreMsg(SCORE_V1)], 2); // 2⭐ < 3⭐
    fireEvent.click(screen.getByTestId('lane-menu-btn-0'));
    fireEvent.click(screen.getByTestId('lane-menu-reroll-0'));
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
  });

  it('closes the ⋯ menu via the backdrop without acting', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('lane-menu-btn-0'));
    fireEvent.click(screen.getByLabelText('Close menu'));
    expect(screen.queryByTestId('lane-menu-0')).not.toBeInTheDocument();
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
    expect(triggerBlobDownloadMock).not.toHaveBeenCalled();
  });

  it('collapses lanes into a drawer with a persistent handle on narrow screens (AC-12)', () => {
    // Narrow viewport (D-MS9): matchMedia says <740px, so the pane renders the
    // stacked mobile column where the lanes hide behind the 🎚 drawer.
    const mm = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: false, // '(min-width: 740px)' → narrow
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
      const region = screen.getByTestId('lanes-region');
      expect(region).toHaveClass('hidden');
      const handle = screen.getByTestId('lanes-drawer-handle');
      fireEvent.click(handle);
      expect(region).toHaveClass('block');
      expect(region).not.toHaveClass('hidden');
      fireEvent.click(handle);
      expect(region).toHaveClass('hidden');
    } finally {
      window.matchMedia = mm;
    }
  });

  it('renders the studio split on wide screens — deck column + always-visible lanes (D-MS9)', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    // The deck column holds the AI conversation with the composer docked below.
    const deck = screen.getByTestId('stage-deck');
    expect(deck).toContainElement(screen.getByTestId('ai-bubble'));
    expect(deck).toContainElement(screen.getByTestId('composer-input'));
    // The lanes sit under the stage, always on screen — no drawer classes.
    const region = screen.getByTestId('lanes-region');
    expect(region).not.toHaveClass('hidden');
    expect(screen.getByTestId('music-stage')).not.toHaveClass('is-empty');
    // The immersive page hides the Learn nav (D-MS7), so the transport bar
    // carries the Airbotix brand mark, like the playground's Taskbar.
    expect(screen.getByTestId('stage-brand')).toContainElement(screen.getByAltText('Airbotix'));
  });

  // ── 🎧 Make it real (§2 step ⑥) — the score becomes actual audio ────────────
  // The retired Music Maker was the only way a kid could get a real track. It now
  // lives HERE, on top of a song they composed, so the two never diverge.

  describe('make it real', () => {
    it('sends the CURRENT score to the audio provider and reveals the recording', async () => {
      generateRealSongMock.mockResolvedValue({
        id: 'el_music_1',
        url: 'data:audio/mpeg;base64,AAA',
        mime_type: 'audio/mpeg',
        stars_charged: 3,
        balance_after: 9,
        project_id: 'p_song',
      });
      renderPane([scoreMsg(SCORE_V1)]);

      // Two-step (track-editing PRD §3-B): the confirm shows what the AI will
      // hear — mix included — BEFORE the 3⭐ call fires.
      fireEvent.click(screen.getByTestId('stage-real-song'));
      expect(generateRealSongMock).not.toHaveBeenCalled();
      expect(screen.getByTestId('real-song-prompt-preview')).toHaveTextContent(/featuring/);
      fireEvent.click(screen.getByTestId('real-song-confirm-go'));

      await waitFor(() => expect(generateRealSongMock).toHaveBeenCalledTimes(1));
      // An audio Artifact requires a project (backend runMedia): recording without
      // one would hand the kid a song that vanishes on reload.
      expect(generateRealSongMock.mock.calls[0][0]).toMatchObject({
        score: SCORE_V1,
        classId: null,
        projectId: null,
      });
      // The stage mix rides the request (PRD §3-B).
      expect(generateRealSongMock.mock.calls[0][0].mix).toMatchObject({ solo: null });
      // The audio lands on the session as a track — open the Mixer so the kid
      // sees where their song went instead of nothing appearing to happen.
      await screen.findByTestId('legacy-track-list');
    });

    it('never fires an unaffordable request (AC-8)', () => {
      renderPane([scoreMsg(SCORE_V1)], 2); // 2⭐ < 3⭐
      const btn = screen.getByTestId('stage-real-song');
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(generateRealSongMock).not.toHaveBeenCalled();
    });

    // D-MS10 regression (caught by the harness): a typed EDIT instruction
    // ("make it faster") must NOT become the song's TOPIC — the recording
    // prompt derives from the original description (D-MS6).
    it('keeps the ORIGINAL description as the topic after a typed edit', async () => {
      generateMusicScoreMock.mockResolvedValue({
        score: SCORE_V2,
        stars_charged: 3,
        balance_after: 9,
        artifact_id: null,
        session_id: 's1',
      });
      generateRealSongMock.mockResolvedValue({
        id: 'el_music_1',
        url: 'data:audio/mpeg;base64,AAA',
        mime_type: 'audio/mpeg',
        stars_charged: 3,
        balance_after: 6,
        project_id: 'p_song',
      });
      renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
      // Typed edit (default edit mode) — an instruction, not a topic.
      fireEvent.change(screen.getByTestId('composer-input'), {
        target: { value: 'make it a little faster' },
      });
      fireEvent.click(screen.getByTestId('composer-generate'));
      await waitFor(() => expect(generateMusicScoreMock).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByTestId('stage-real-song'));
      fireEvent.click(screen.getByTestId('real-song-confirm-go'));
      await waitFor(() => expect(generateRealSongMock).toHaveBeenCalledTimes(1));
      expect(generateRealSongMock.mock.calls[0][0]).toMatchObject({
        topic: 'a space puppy adventure',
      });
    });

    it('is absent until there is a song to record', () => {
      renderPane([]);
      expect(screen.queryByTestId('stage-real-song')).not.toBeInTheDocument();
    });

    it('tells the kid no Stars were charged when the provider fails', async () => {
      generateRealSongMock.mockRejectedValue(new Error('boom'));
      renderPane([scoreMsg(SCORE_V1)]);
      fireEvent.click(screen.getByTestId('stage-real-song'));
      fireEvent.click(screen.getByTestId('real-song-confirm-go'));
      expect(await screen.findByText(/no Stars were charged/i)).toBeInTheDocument();
    });

    it('cancel closes the confirm without spending anything', () => {
      renderPane([scoreMsg(SCORE_V1)]);
      fireEvent.click(screen.getByTestId('stage-real-song'));
      fireEvent.click(screen.getByTestId('real-song-cancel'));
      expect(screen.queryByTestId('real-song-confirm')).not.toBeInTheDocument();
      expect(generateRealSongMock).not.toHaveBeenCalled();
    });
  });

  describe('↓ Song mix export (track-editing PRD §3-C)', () => {
    it('renders the WHOLE mix client-side and downloads song.wav (AC-6)', async () => {
      renderScoreMock.mockResolvedValue({});
      renderPane([scoreMsg(SCORE_V1)]);
      fireEvent.click(screen.getByTestId('stage-download-mix'));
      await waitFor(() => expect(triggerBlobDownloadMock).toHaveBeenCalledTimes(1));
      expect(renderScoreMock.mock.calls[0][3]).toBeUndefined(); // no stem index
      expect(triggerBlobDownloadMock.mock.calls[0][1]).toBe('space-pup.wav');
      expect(generateMusicScoreMock).not.toHaveBeenCalled();
      expect(generateRealSongMock).not.toHaveBeenCalled();
    });

    it('surfaces a friendly bubble when the render fails', async () => {
      renderScoreMock.mockRejectedValue(new Error('no AudioContext'));
      renderPane([scoreMsg(SCORE_V1)]);
      fireEvent.click(screen.getByTestId('stage-download-mix'));
      expect(await screen.findByText(/couldn't render that file/i)).toBeInTheDocument();
    });
  });

  it('shows the DEV fake-AI note so mock-stack sessions are not misread (PRD §4)', () => {
    // vitest runs DEV builds; production builds strip this via import.meta.env.
    renderPane([scoreMsg(SCORE_V1)]);
    expect(screen.getByTestId('dev-mock-note')).toBeInTheDocument();
  });

  describe('save', () => {
    it('attaches the song to the class when the kid came from "create for class"', async () => {
      saveScoreToMyWorksMock.mockResolvedValue({ project_id: 'p1' });
      renderPane([scoreMsg(SCORE_V1)], 12, 'class_42');

      fireEvent.click(screen.getByTestId('stage-save'));

      await waitFor(() => expect(saveScoreToMyWorksMock).toHaveBeenCalled());
      // Without this the song is saved to My Works but is invisible to the
      // teacher — the whole point of the class row.
      expect(saveScoreToMyWorksMock.mock.calls[0][1]).toBe('class_42');
    });

    it('passes no class when the kid opened the Stage on their own', async () => {
      saveScoreToMyWorksMock.mockResolvedValue({ project_id: 'p1' });
      renderPane([scoreMsg(SCORE_V1)]);
      fireEvent.click(screen.getByTestId('stage-save'));
      await waitFor(() => expect(saveScoreToMyWorksMock).toHaveBeenCalled());
      expect(saveScoreToMyWorksMock.mock.calls[0][1]).toBeNull();
    });
  });
});

// ── §5A D-MS11/D-MS12: Riff Pad, frame 0, diff chips ────────────

function seededScoreMsg(score: MusicScore, seed: unknown): Message {
  const m = scoreMsg(score);
  return { ...m, metadata: { score, seed } };
}

const SEED = {
  tempo: 100,
  key: 'C major',
  tracks: [
    {
      instrument: 'guitar',
      role: 'lead',
      notes: [
        { time: 0, note: 'C4', duration: '8n' },
        { time: 0.5, note: 'E4', duration: '8n' },
      ],
    },
  ],
};

describe('MusicStagePane — Riff Pad (§5A D-MS11)', () => {
  it('empty stage offers the hand-first door: CTA opens the pad, generate stays gated until a note is tapped', () => {
    renderPane([]);
    expect(screen.queryByTestId('riff-pad')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('riff-cta'));
    expect(screen.getByTestId('riff-pad')).toBeInTheDocument();
    // Nothing tapped yet → the riff can't seed a song (and words are optional).
    expect(screen.getByTestId('composer-generate')).toBeDisabled();
    fireEvent.click(screen.getByTestId('riff-cell-m-7-0'));
    expect(screen.getByTestId('riff-count')).toHaveTextContent('1 notes · 0⭐');
    expect(screen.getByTestId('composer-generate')).toBeEnabled();
    // Tapping cells is 0⭐ hands-on work — no AI call, no request.
    expect(generateMusicScoreMock).not.toHaveBeenCalled();
  });

  it('riff generate sends the tapped motif as seedScore with the default prompt', async () => {
    generateMusicScoreMock.mockReturnValue(new Promise(() => {}));
    renderPane([]);
    fireEvent.click(screen.getByTestId('riff-cta'));
    fireEvent.click(screen.getByTestId('riff-cell-m-7-0')); // C4 @ step 0
    fireEvent.click(screen.getByTestId('riff-cell-d-2-0')); // kick @ step 0
    fireEvent.click(screen.getByTestId('composer-generate'));
    await waitFor(() => expect(generateMusicScoreMock).toHaveBeenCalledTimes(1));
    const req = generateMusicScoreMock.mock.calls[0][0];
    expect(req.prompt.length).toBeGreaterThan(0);
    expect(req.existingScore).toBeUndefined();
    expect(req.seedScore).toMatchObject({ tempo: 100, key: 'C major' });
    expect(req.seedScore.tracks[0]).toMatchObject({ instrument: 'guitar', role: 'lead' });
    expect(req.seedScore.tracks[0].notes[0]).toEqual({ time: 0, note: 'C4', duration: '8n' });
    expect(req.seedScore.tracks[1]).toMatchObject({ instrument: 'drums', role: 'percussion' });
  });

  it('a persisted seed renders the permanent 🎹 frame-0 pill and toggles the compare audition', async () => {
    renderPane([userMsg('my riff song'), seededScoreMsg(SCORE_V1, SEED)]);
    const pill = screen.getByTestId('riff-frame-pill');
    expect(pill).toHaveTextContent('My riff');
    fireEvent.click(pill);
    // Audition swaps the played score and starts the loop on the ONE engine.
    await waitFor(() => expect(playbackMock.play).toHaveBeenCalled());
    expect(screen.getByTestId('riff-frame-pill')).toHaveTextContent('⏹');
  });

  it('a seeded first take tells the kid the melody starts with THEIR notes', () => {
    renderPane([userMsg('my riff song'), seededScoreMsg(SCORE_V1, SEED)]);
    expect(screen.getByTestId('ai-bubble')).toHaveTextContent('YOUR riff');
  });

  it('with a song on stage, the composer offers the 🎹 From my riff mode tab', () => {
    renderPane([userMsg('a song'), scoreMsg(SCORE_V1)]);
    expect(screen.queryByTestId('riff-pad')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('compose-mode-riff'));
    expect(screen.getByTestId('riff-pad')).toBeInTheDocument();
  });
});

describe('MusicStagePane — diff chips (§5A D-MS12)', () => {
  it('shows what musically changed between the previous and current version', () => {
    renderPane([userMsg('a song'), scoreMsg(SCORE_V1), scoreMsg(SCORE_V2)]);
    expect(screen.getByTestId('diff-chips')).toBeInTheDocument();
    expect(screen.getByTestId('diff-chip-0')).toHaveTextContent('118→126 BPM');
  });

  it('renders no chip row on the very first take', () => {
    renderPane([userMsg('a song'), scoreMsg(SCORE_V1)]);
    expect(screen.queryByTestId('diff-chips')).not.toBeInTheDocument();
  });
});
