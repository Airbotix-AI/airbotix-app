// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import type { Message } from '../WorkspacePage';
import type { MusicScore } from './scoreTypes';

const { playbackMock, generateMusicScoreMock, preloadProgramsMock } = vi.hoisted(() => ({
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
}));

vi.mock('./useScorePlayback', () => ({
  useScorePlayback: () => playbackMock,
}));
vi.mock('./musicScoreApi', () => ({
  generateMusicScore: generateMusicScoreMock,
}));
// smplr layer is exercised in soundfont.test.ts — here only the preload call.
vi.mock('./soundfont', () => ({
  preloadPrograms: preloadProgramsMock,
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
function scoreMsg(score: MusicScore): Message {
  nextId += 1;
  return {
    id: `m${nextId}`,
    role: 'assistant',
    tool: 'music',
    content: 'Here is your song!',
    artifact_id: `a${nextId}`,
    stars_charged: 0,
    created_at: new Date().toISOString(),
    artifact: {
      id: `a${nextId}`,
      kind: 'text',
      mime_type: 'application/json',
      s3_key: `score/${nextId}.json`,
      project_id: 'p1',
      metadata: { score },
    },
  };
}

function renderPane(messages: Message[], balance = 12) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MusicStagePane
        sessionId="s1"
        messages={messages}
        balance={balance}
        kidId="k1"
        familyId="f1"
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
    expect(screen.getByTestId('stage-empty-hint')).toHaveTextContent('Your band is waiting for a song');
    expect(screen.getByTestId('stage-play')).toBeDisabled();
    expect(screen.getByTestId('stage-inst-guitar')).toBeDisabled();
    expect(screen.getByTestId('composer-input')).toBeEnabled();
    expect(screen.getByTestId('ai-bubble')).toHaveTextContent('band conductor');
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

  it('sends structured modifier + existingScore for suggestion cards (AC-4)', async () => {
    generateMusicScoreMock.mockResolvedValue({ stars_charged: 3, balance_after: 9, artifact_id: 'a9' });
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('suggestion-energy_up'));
    await waitFor(() =>
      expect(generateMusicScoreMock).toHaveBeenCalledWith({
        prompt: 'a space puppy adventure',
        options: { genre: 'Rock' },
        modifier: 'energy_up',
        existingScore: SCORE_V1,
      }),
    );
  });

  it('re-rolls from scratch for 🎲 Surprise me — same prompt, no existingScore (AC-3)', async () => {
    generateMusicScoreMock.mockResolvedValue({ stars_charged: 3, balance_after: 9, artifact_id: 'a9' });
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
    fireEvent.click(screen.getByTestId('suggestion-big_drums'));
    expect(await screen.findByTestId('bubble-retry')).toBeInTheDocument();
    expect(screen.getByTestId('ai-bubble')).toHaveTextContent('Let’s keep songs friendly!');
    fireEvent.click(screen.getByTestId('bubble-retry'));
    await waitFor(() => expect(generateMusicScoreMock).toHaveBeenCalledTimes(2));
  });
});

describe('MusicStagePane — with a song (AC-2 render)', () => {
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

  it('keeps download/edit/re-roll off the lane — the ⋯ menu points at the Mixer', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    fireEvent.click(screen.getByTestId('lane-menu-btn-0'));
    const menu = screen.getByTestId('lane-menu-0');
    expect(menu).toHaveTextContent('Opens in the Mixer');
    // Mixer not wired yet: entries are visible but honestly greyed out.
    expect(screen.getByTestId('lane-menu-download-0')).toBeDisabled();
    expect(screen.getByTestId('lane-menu-edit-0')).toBeDisabled();
    expect(screen.getByTestId('lane-menu-reroll-0')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Close menu'));
    expect(screen.queryByTestId('lane-menu-0')).not.toBeInTheDocument();
  });

  it('collapses lanes into a drawer with a persistent handle on narrow screens (AC-12)', () => {
    renderPane([userMsg('a space puppy adventure'), scoreMsg(SCORE_V1)]);
    const region = screen.getByTestId('lanes-region');
    expect(region).toHaveClass('hidden', 'min-[740px]:block');
    const handle = screen.getByTestId('lanes-drawer-handle');
    fireEvent.click(handle);
    expect(region).toHaveClass('block');
    expect(region).not.toHaveClass('hidden');
    fireEvent.click(handle);
    expect(region).toHaveClass('hidden');
  });
});
