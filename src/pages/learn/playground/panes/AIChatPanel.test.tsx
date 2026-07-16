// @vitest-environment jsdom
//
// FE1 — the teacher's "what shall we do next?" option chips (§11.4 / D-PAP-06):
// a settled agent bubble carrying `nextSteps` renders tappable chips, and tapping
// one sends its prompt as the next turn.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AIChatPanel } from './AIChatPanel';
import type { ChatImageRef } from '../../code/codeApi';
import type { ChatItem } from './useGameAgent';

afterEach(cleanup);

describe('AIChatPanel — next-step option chips', () => {
  // A turn WITH changes → its chips are guided next steps (NOT a question turn).
  const chat: ChatItem[] = [
    {
      id: 'a1',
      role: 'agent',
      text: 'Your player can jump now! 🦘',
      changes: [{ path: 'main.js', before: 'a', after: 'b' }],
      nextSteps: [
        { label: 'Add a score', prompt: 'add a score', tag: 'concept' },
        { label: 'Make it bounce', prompt: 'make it bounce', tag: 'fun' },
      ],
    },
  ];

  it('renders one chip per next step, with the labels', () => {
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={vi.fn()} />);
    const chips = screen.getAllByTestId('next-step');
    expect(chips).toHaveLength(2);
    expect(chips[0].textContent).toContain('Add a score');
    expect(chips[1].textContent).toContain('Make it bounce');
  });

  it('tapping a chip sends that option’s prompt as a GUIDED step (D-PAP-26 #1)', () => {
    const onSend = vi.fn();
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={onSend} />);
    fireEvent.click(screen.getAllByTestId('next-step')[1]);
    // Guided so the teacher keeps offering the next phase's options (chip→chip loop).
    expect(onSend).toHaveBeenCalledWith('make it bounce', { guided: true });
  });

  it('renders no chip row when a bubble has no next steps', () => {
    const plain: ChatItem[] = [{ id: 'a2', role: 'agent', text: 'Done!' }];
    render(<AIChatPanel chat={plain} busy={false} error={null} onSend={vi.fn()} />);
    expect(screen.queryByTestId('next-steps')).toBeNull();
  });

  // The chat log keeps a visible scrollbar; it must carry the themed `pg-scroll`
  // utility (slim, rounded, `pg-*`-toned) rather than the heavy default OS bar.
  it('themes the scroll log with the pg-scroll utility', () => {
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={vi.fn()} />);
    expect(screen.getByRole('log').className).toContain('pg-scroll');
  });

  // Teacher live read-only viewer (D-LV-6): the chat history shows but there is no
  // composer / send and no next-step chips (they would fire a turn).
  it('read-only: hides the composer + next-step chips and shows the read-only note', () => {
    const onSend = vi.fn();
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={onSend} readOnly />);
    // The conversation still renders.
    expect(screen.getByText('Your player can jump now! 🦘')).toBeTruthy();
    // No composer, no chips → a teacher can never type, send, or fire a turn.
    expect(screen.queryByTestId('chat-input')).toBeNull();
    expect(screen.queryByTestId('chat-send')).toBeNull();
    expect(screen.queryByTestId('next-steps')).toBeNull();
    expect(screen.getByTestId('chat-readonly-note')).toBeTruthy();
  });
});

// D-HARN-07 — ANSWER chips on question turns: a settled turn with ZERO changes and
// next-step chips is a QUESTION turn (the summary asks, the chips answer). Answer
// chips send guided:false — guided:true would select the guided-chip prompt goal
// server-side and re-offer chips, the wrong framing for an answer. Chips on turns
// WITH changes keep guided:true exactly as before; testid stays `next-step`.
describe('AIChatPanel — answer chips on question turns (D-HARN-07)', () => {
  const questionChat: ChatItem[] = [
    {
      id: 'q1',
      role: 'agent',
      text: 'Should the aliens shoot lasers or drop bombs?',
      changes: [],
      nextSteps: [
        { label: '🔫 Lasers', prompt: 'the aliens shoot lasers', tag: 'concept' },
        { label: '💣 Bombs', prompt: 'the aliens drop bombs', tag: 'fun' },
      ],
    },
  ];

  it('a zero-change + chips turn sends the tapped answer with guided:false', () => {
    const onSend = vi.fn();
    render(<AIChatPanel chat={questionChat} busy={false} error={null} onSend={onSend} />);
    fireEvent.click(screen.getAllByTestId('next-step')[0]);
    expect(onSend).toHaveBeenCalledWith('the aliens shoot lasers', { guided: false });
  });

  it('renders the "Pick one:" lead-in ONLY on a question turn', () => {
    render(<AIChatPanel chat={questionChat} busy={false} error={null} onSend={vi.fn()} />);
    expect(screen.getByText('Pick one:')).toBeTruthy();
    expect(screen.queryByText('What next?')).toBeNull();
  });

  it('a turn WITH changes keeps the guided framing ("What next?", guided:true)', () => {
    const onSend = vi.fn();
    const withChanges: ChatItem[] = [
      {
        id: 'a1',
        role: 'agent',
        text: 'Added a score!',
        changes: [{ path: 'main.js', before: 'a', after: 'b' }],
        nextSteps: [{ label: 'Make it bounce', prompt: 'make it bounce', tag: 'fun' }],
      },
    ];
    render(<AIChatPanel chat={withChanges} busy={false} error={null} onSend={onSend} />);
    expect(screen.getByText('What next?')).toBeTruthy();
    expect(screen.queryByText('Pick one:')).toBeNull();
    fireEvent.click(screen.getByTestId('next-step'));
    expect(onSend).toHaveBeenCalledWith('make it bounce', { guided: true });
  });

  it('a seed bubble carrying actions (launch hand-off) is NOT a question turn', () => {
    const onSend = vi.fn();
    const seeded: ChatItem[] = [
      {
        id: 'first-agent',
        role: 'agent',
        text: 'I built your starter!',
        actions: ['run', 'code'],
        nextSteps: [{ label: 'Add a score', prompt: 'add a score', tag: 'concept' }],
      },
    ];
    render(<AIChatPanel chat={seeded} busy={false} error={null} onSend={onSend} />);
    expect(screen.getByText('What next?')).toBeTruthy();
    fireEvent.click(screen.getByTestId('next-step'));
    // The first-turn chips stay in the D-PAP-26 guided chip→chip loop.
    expect(onSend).toHaveBeenCalledWith('add a score', { guided: true });
  });
});

// D-HARN-03 — no silent input drops: while a turn is busy the next-step chips render
// disabled, the composer queues exactly ONE message through onSend (the hook owns the
// queue), and the queued pill shows the message with a ✕ cancel.
describe('AIChatPanel — busy queue + disabled send paths (D-HARN-03)', () => {
  // A turn WITH changes → guided next-step chips (not a D-HARN-07 question turn).
  const chatWithChips: ChatItem[] = [
    {
      id: 'a1',
      role: 'agent',
      text: 'Done!',
      changes: [{ path: 'main.js', before: 'a', after: 'b' }],
      nextSteps: [{ label: 'Add a score', prompt: 'add a score', tag: 'concept' }],
    },
  ];

  it('disables the next-step chips while a turn is busy', () => {
    const onSend = vi.fn();
    render(<AIChatPanel chat={chatWithChips} busy error={null} onSend={onSend} />);
    const chip = screen.getByTestId('next-step') as HTMLButtonElement;
    expect(chip.disabled).toBe(true);
    fireEvent.click(chip);
    expect(onSend).not.toHaveBeenCalled();
  });

  it('chips are enabled again once the turn settles', () => {
    const onSend = vi.fn();
    render(<AIChatPanel chat={chatWithChips} busy={false} error={null} onSend={onSend} />);
    const chip = screen.getByTestId('next-step') as HTMLButtonElement;
    expect(chip.disabled).toBe(false);
    fireEvent.click(chip);
    expect(onSend).toHaveBeenCalledWith('add a score', { guided: true });
  });

  it('Enter while busy still reaches onSend — the hook queues it, never a silent drop', () => {
    const onSend = vi.fn();
    render(<AIChatPanel chat={[]} busy error={null} onSend={onSend} queuedMessage={null} />);
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'next thing' } });
    fireEvent.keyDown(screen.getByTestId('chat-input'), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('next thing', undefined);
    // The composer cleared into the queue slot.
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('');
  });

  it('Enter while busy with a message ALREADY queued keeps the draft (no send, no clear)', () => {
    const onSend = vi.fn();
    render(
      <AIChatPanel chat={[]} busy error={null} onSend={onSend} queuedMessage={{ text: 'queued one' }} />,
    );
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'a third idea' } });
    fireEvent.keyDown(screen.getByTestId('chat-input'), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('a third idea');
  });

  it('renders the queued pill with the message; ✕ calls onCancelQueued', () => {
    const onCancelQueued = vi.fn();
    render(
      <AIChatPanel
        chat={[]}
        busy
        error={null}
        onSend={vi.fn()}
        queuedMessage={{ text: 'make it rain' }}
        onCancelQueued={onCancelQueued}
      />,
    );
    const pill = screen.getByTestId('chat-queued-pill');
    expect(pill.textContent).toContain("I'll do this next:");
    expect(pill.textContent).toContain('make it rain');
    fireEvent.click(screen.getByTestId('chat-queued-cancel'));
    expect(onCancelQueued).toHaveBeenCalledTimes(1);
  });

  it('no pill when nothing is queued', () => {
    render(<AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} />);
    expect(screen.queryByTestId('chat-queued-pill')).toBeNull();
  });
});

// D-HARN-02/03/05 — the per-bubble "Try again" chip: a retryable failed / timed-out /
// flush-blocked turn carries one calm chip that replays THAT bubble's OWN turn —
// onRetryTurn receives the bubble's payload (its exact prompt + its SAME idempotency
// key), so a stale chip can never replay a later turn.
describe('AIChatPanel — retry chip on a retryable bubble (D-HARN-02/03/05)', () => {
  const retryA = { prompt: 'make it blue', turnKey: 'key-A', guided: false };
  const failedChat: ChatItem[] = [
    { id: 'k1', role: 'kid', text: 'make it blue' },
    { id: 'a1', role: 'agent', text: "That took too long — let's try again!", retry: retryA },
  ];

  it('tapping the chip sends THAT bubble’s own payload to onRetryTurn', () => {
    const onRetryTurn = vi.fn();
    render(
      <AIChatPanel chat={failedChat} busy={false} error={null} onSend={vi.fn()} onRetryTurn={onRetryTurn} />,
    );
    fireEvent.click(screen.getByTestId('chat-retry-chip'));
    expect(onRetryTurn).toHaveBeenCalledTimes(1);
    expect(onRetryTurn).toHaveBeenCalledWith(retryA);
  });

  it('a STALE chip still carries its own turn — never a later one', () => {
    const onRetryTurn = vi.fn();
    const retryB = { prompt: 'add lasers', turnKey: 'key-B', guided: true };
    const twoFailures: ChatItem[] = [
      { id: 'a1', role: 'agent', text: 'The AI helper had a hiccup…', retry: retryA },
      { id: 'k2', role: 'kid', text: 'add lasers' },
      { id: 'a2', role: 'agent', text: "That took too long — let's try again!", retry: retryB },
    ];
    render(
      <AIChatPanel chat={twoFailures} busy={false} error={null} onSend={vi.fn()} onRetryTurn={onRetryTurn} />,
    );
    const chips = screen.getAllByTestId('chat-retry-chip');
    expect(chips).toHaveLength(2);
    fireEvent.click(chips[0]); // the OLD bubble's chip
    expect(onRetryTurn).toHaveBeenLastCalledWith(retryA);
    fireEvent.click(chips[1]);
    expect(onRetryTurn).toHaveBeenLastCalledWith(retryB);
  });

  it('no chip on an ordinary settled bubble', () => {
    const plain: ChatItem[] = [{ id: 'a1', role: 'agent', text: 'Done!' }];
    render(<AIChatPanel chat={plain} busy={false} error={null} onSend={vi.fn()} onRetryTurn={vi.fn()} />);
    expect(screen.queryByTestId('chat-retry-chip')).toBeNull();
  });

  it('hides the chip in the read-only viewer (a teacher never fires a turn)', () => {
    render(
      <AIChatPanel chat={failedChat} busy={false} error={null} onSend={vi.fn()} onRetryTurn={vi.fn()} readOnly />,
    );
    expect(screen.queryByTestId('chat-retry-chip')).toBeNull();
  });

  it('the chip is disabled while another turn is busy', () => {
    const onRetryTurn = vi.fn();
    render(<AIChatPanel chat={failedChat} busy error={null} onSend={vi.fn()} onRetryTurn={onRetryTurn} />);
    const chip = screen.getByTestId('chat-retry-chip') as HTMLButtonElement;
    expect(chip.disabled).toBe(true);
    fireEvent.click(chip);
    expect(onRetryTurn).not.toHaveBeenCalled();
  });
});

// D-PAP-48 — "Stop waiting" while the agent is thinking. When `busy` and NOT yet
// `streaming` (no reply arrived), the composer shows the stop-waiting button; tapping
// it aborts the in-flight turn. It is distinct from the H1 animation-skip Stop
// (`chat-stop`), which only shows once the reply is replaying.
describe('AIChatPanel — stop waiting for the AI turn (D-PAP-48)', () => {
  const chat: ChatItem[] = [
    { id: 'k1', role: 'kid', text: 'make it blue' },
    { id: 'a1', role: 'agent', text: 'Thinking…', pending: true },
  ];

  it('shows the stop-waiting button while busy (not streaming) and taps call onCancelTurn', () => {
    const onCancelTurn = vi.fn();
    render(
      <AIChatPanel chat={chat} busy streaming={false} error={null} onSend={vi.fn()} onCancelTurn={onCancelTurn} />,
    );
    const stop = screen.getByTestId('chat-stop-waiting');
    // The animation-skip Stop (H1) must NOT show — the reply hasn't started streaming.
    expect(screen.queryByTestId('chat-stop')).toBeNull();
    // Nor the Send button (the composer is busy).
    expect(screen.queryByTestId('chat-send')).toBeNull();
    fireEvent.click(stop);
    expect(onCancelTurn).toHaveBeenCalledTimes(1);
  });

  it('shows the animation-skip Stop (not stop-waiting) once the reply is streaming', () => {
    render(<AIChatPanel chat={chat} busy streaming error={null} onSend={vi.fn()} onCancelTurn={vi.fn()} />);
    expect(screen.getByTestId('chat-stop')).toBeTruthy();
    expect(screen.queryByTestId('chat-stop-waiting')).toBeNull();
  });
});

// §11.4 — per-file "what changed" rows: ONE clickable row per file (consolidate
// multiple edits), with the teacher's note; tapping opens the editor + highlights.
describe('AIChatPanel — changed-file rows', () => {
  const before = 'class Game {\n  create() {}\n}\n';
  const after = 'class Game {\n  create() {\n    this.add.rectangle(1, 2, 3, 4);\n  }\n}\n';
  const chat: ChatItem[] = [
    {
      id: 'a1',
      role: 'agent',
      text: 'Added a wall.',
      // The same file edited twice — must consolidate to ONE row.
      changes: [
        { path: 'src/scenes/Game.js', before, after },
        { path: 'src/scenes/Game.js', before: after, after: after + '// more\n' },
      ],
      fileNotes: [{ path: 'src/scenes/Game.js', note: 'added a wall + collision' }],
    },
  ];

  it('consolidates multiple edits to one file into a single row, with its note', () => {
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={vi.fn()} />);
    const rows = screen.getAllByTestId('file-change');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('src/scenes/Game.js');
    expect(rows[0].textContent).toContain('added a wall + collision');
  });

  it('gives every file a one-sentence description even with no model notes (first-turn scaffold)', () => {
    const scaffold: ChatItem[] = [
      {
        id: 's1',
        role: 'agent',
        text: 'I made a starter game!',
        // First-turn files arrive as toolsFired (no diff, no notes).
        toolsFired: ['write_file:main.js', 'write_file:src/scenes/Game.js', 'write_file:style.css'],
      },
    ];
    render(<AIChatPanel chat={scaffold} busy={false} error={null} onSend={vi.fn()} />);
    const rows = screen.getAllByTestId('file-change');
    expect(rows).toHaveLength(3);
    // Each row reads as a sentence, never a bare path.
    expect(rows.find((r) => r.textContent?.includes('main.js'))?.textContent).toContain('starting point');
    expect(rows.find((r) => r.textContent?.includes('style.css'))?.textContent).toContain('looks');
  });

  it('tapping a row opens the file at the changed line range', () => {
    const onOpenFile = vi.fn();
    render(
      <AIChatPanel chat={chat} busy={false} error={null} onSend={vi.fn()} onOpenFile={onOpenFile} />,
    );
    fireEvent.click(screen.getByTestId('file-change'));
    // The change starts on line 2 (the create() body grew) — opened with a range.
    expect(onOpenFile).toHaveBeenCalledTimes(1);
    const [path, from, to] = onOpenFile.mock.calls[0];
    expect(path).toBe('src/scenes/Game.js');
    expect(from).toBeGreaterThanOrEqual(2);
    expect(to).toBeGreaterThanOrEqual(from);
  });
});

// One in-flight turn shows the honest WorkingCard (real steps + timer), not the
// old fake-cycling ThinkingBubble — and there's exactly one in-flight indicator.
describe('AIChatPanel — in-flight WorkingCard', () => {
  const pendingChat: ChatItem[] = [
    { id: 'k1', role: 'kid', text: 'make the aliens shoot back' },
    { id: 'a1', role: 'agent', text: '', pending: true },
  ];
  const progress = {
    startedAt: Date.now() - 2000,
    steps: [
      { id: 's1', key: 'Aliens.js', label: 'Adding Aliens', status: 'active' as const, startedAt: Date.now() - 2000 },
    ],
  };

  it('renders the WorkingCard (with the real step) for a pending turn when progress is set', () => {
    render(<AIChatPanel chat={pendingChat} busy progress={progress} error={null} onSend={vi.fn()} />);
    expect(screen.getByTestId('working-card')).toBeTruthy();
    expect(screen.getByText('Adding Aliens')).toBeTruthy();
    expect(screen.queryByTestId('thinking-bubble')).toBeNull();
  });

  it('falls back to the ThinkingBubble only if progress has not seeded yet', () => {
    render(<AIChatPanel chat={pendingChat} busy progress={null} error={null} onSend={vi.fn()} />);
    expect(screen.getByTestId('thinking-bubble')).toBeTruthy();
    expect(screen.queryByTestId('working-card')).toBeNull();
  });
});

// The helper is branded "Airo" (from Airbotix) with its robot avatar.
describe('AIChatPanel — Airo branding', () => {
  it('names the helper Airo in the header + on a settled message, with the avatar', () => {
    const chat: ChatItem[] = [{ id: 'a1', role: 'agent', text: 'Done!' }];
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={vi.fn()} />);
    // Header + the settled message header both read "Airo".
    expect(screen.getAllByText('Airo').length).toBeGreaterThanOrEqual(2);
    // The robot avatar is rendered (not a plain circle).
    expect(screen.getAllByTestId('airo-avatar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/I'm Airo, a robot helper/)).toBeTruthy();
  });
});

describe('AIChatPanel — changed-file rows with new files (null before)', () => {
  it('renders a bubble whose changes include a NEW file (before=null) without crashing', () => {
    // A whole-game rebuild (e.g. the 2D→3D switch) creates files with no `before`.
    // changedLineRange must not .split(null). (Regression: full-screen crash.)
    const chat: ChatItem[] = [
      {
        id: 'r1',
        role: 'agent',
        text: 'Rebuilt your game in 3D! 🎲',
        changes: [
          { path: 'main.js', before: null as unknown as string, after: 'const x = 1;\n' },
          { path: 'src/scene.js', before: null as unknown as string, after: 'a\nb\n' },
        ],
      },
    ];
    expect(() =>
      render(<AIChatPanel chat={chat} busy={false} error={null} onSend={vi.fn()} />),
    ).not.toThrow();
    // getByText throws if missing — proves the bubble rendered.
    expect(screen.getByText('Rebuilt your game in 3D! 🎲')).toBeTruthy();
  });
});

// Image input composer (D-PAP-33..37): paste/pick → upload → thumbnail strip;
// send allows text-OR-images and is blocked while uploading; readOnly + flag-off
// hide the affordance entirely.
describe('AIChatPanel — image attachments', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:thumb-1');
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => vi.restoreAllMocks());

  const pngFile = (name = 'cat.png') => new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });

  /** A defer-able uploader: the test resolves it when it wants the upload to finish. */
  function deferredUploader() {
    let resolve!: (ref: ChatImageRef) => void;
    const promise = new Promise<ChatImageRef>((r) => (resolve = r));
    const fn = vi.fn(() => promise);
    return { fn, resolve };
  }

  function pasteImage(textarea: HTMLElement, file: File) {
    fireEvent.paste(textarea, { clipboardData: { files: [file] } });
  }

  it('pasting an image stages a thumbnail (uploading → ready)', async () => {
    const { fn, resolve } = deferredUploader();
    render(<AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={fn} />);

    pasteImage(screen.getByTestId('chat-input'), pngFile());

    // Thumbnail appears immediately, spinning while it uploads.
    const thumb = await screen.findByTestId('chat-attachment');
    expect(thumb.getAttribute('data-status')).toBe('uploading');
    expect(screen.getByTestId('chat-attachment-spinner')).toBeTruthy();
    expect(fn).toHaveBeenCalledTimes(1);

    // Upload resolves → ready.
    resolve({ s3_key: 'chat-input/p/1', mime: 'image/png' });
    await waitFor(() => expect(screen.getByTestId('chat-attachment').getAttribute('data-status')).toBe('ready'));
  });

  it('the remove button clears a staged thumbnail', async () => {
    const { fn, resolve } = deferredUploader();
    render(<AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={fn} />);
    pasteImage(screen.getByTestId('chat-input'), pngFile());
    resolve({ s3_key: 'k', mime: 'image/png' });
    await screen.findByTestId('chat-attachment');

    fireEvent.click(screen.getByTestId('chat-attachment-remove'));
    expect(screen.queryByTestId('chat-attachment')).toBeNull();
  });

  it('Send is DISABLED while an image is uploading, then enabled when ready', async () => {
    const { fn, resolve } = deferredUploader();
    render(<AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={fn} />);
    pasteImage(screen.getByTestId('chat-input'), pngFile());
    await screen.findByTestId('chat-attachment');

    // Mid-upload: even with no text, send is blocked.
    expect((screen.getByTestId('chat-send') as HTMLButtonElement).disabled).toBe(true);

    resolve({ s3_key: 'k', mime: 'image/png' });
    await waitFor(() => expect((screen.getByTestId('chat-send') as HTMLButtonElement).disabled).toBe(false));
  });

  it('an image-only send (no text) forwards the uploaded image refs + preview to onSend', async () => {
    const onSend = vi.fn();
    const { fn, resolve } = deferredUploader();
    render(<AIChatPanel chat={[]} busy={false} error={null} onSend={onSend} onUploadImage={fn} />);
    pasteImage(screen.getByTestId('chat-input'), pngFile());
    resolve({ s3_key: 'chat-input/p/9', mime: 'image/png' });
    await waitFor(() => expect((screen.getByTestId('chat-send') as HTMLButtonElement).disabled).toBe(false));

    fireEvent.click(screen.getByTestId('chat-send'));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend).toHaveBeenCalledWith('', {
      images: [{ s3_key: 'chat-input/p/9', mime: 'image/png', previewUrl: 'blob:thumb-1' }],
    });
    // The strip clears on send.
    expect(screen.queryByTestId('chat-attachment')).toBeNull();
  });

  it('renders the picture button + attaches via the hidden file input', async () => {
    const { fn, resolve } = deferredUploader();
    render(<AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={fn} />);
    expect(screen.getByTestId('chat-attach-btn')).toBeTruthy();
    const input = screen.getByTestId('chat-attach-input') as HTMLInputElement;
    expect(input.accept).toContain('image/png');
    expect(input.multiple).toBe(true);

    fireEvent.change(input, { target: { files: [pngFile()] } });
    resolve({ s3_key: 'k', mime: 'image/png' });
    await screen.findByTestId('chat-attachment');
  });

  it('read-only viewer hides the picture button + input (a teacher can never attach)', () => {
    render(
      <AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={vi.fn()} readOnly />,
    );
    expect(screen.queryByTestId('chat-attach-btn')).toBeNull();
    expect(screen.queryByTestId('chat-attach-input')).toBeNull();
  });

  it('hides the picture affordance when image input is disabled (flag off, D-PAP-37)', () => {
    render(
      <AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={vi.fn()} imagesDisabled />,
    );
    expect(screen.queryByTestId('chat-attach-btn')).toBeNull();
  });

  it('a non-image paste is ignored (no thumbnail)', () => {
    const onUploadImage = vi.fn();
    render(<AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={onUploadImage} />);
    fireEvent.paste(screen.getByTestId('chat-input'), {
      clipboardData: { files: [new File(['x'], 'a.txt', { type: 'text/plain' })] },
    });
    expect(screen.queryByTestId('chat-attachment')).toBeNull();
    expect(onUploadImage).not.toHaveBeenCalled();
  });

  it('clears staged thumbnails when imageRejectNonce bumps (moderation rejected)', async () => {
    const { fn, resolve } = deferredUploader();
    const { rerender } = render(
      <AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={fn} imageRejectNonce={0} />,
    );
    pasteImage(screen.getByTestId('chat-input'), pngFile());
    resolve({ s3_key: 'k', mime: 'image/png' });
    await screen.findByTestId('chat-attachment');

    // The hook bumps the nonce after a MODERATION_REJECTED image → the strip clears.
    rerender(
      <AIChatPanel chat={[]} busy={false} error={null} onSend={vi.fn()} onUploadImage={fn} imageRejectNonce={1} />,
    );
    await waitFor(() => expect(screen.queryByTestId('chat-attachment')).toBeNull());
  });

  it('RE-STAGES the same uploaded refs when imageRestore bumps (screen outage, D-PAP-46)', async () => {
    // Submit clears the composer; on MODERATION_UNAVAILABLE the hook hands the
    // unjudged, already-uploaded pictures back — they must reappear `ready`
    // (send enabled with no re-upload) so one tap retries.
    const onSend = vi.fn();
    const { rerender } = render(
      <AIChatPanel
        chat={[]}
        busy={false}
        error={null}
        onSend={onSend}
        onUploadImage={vi.fn()}
        imageRestore={{ nonce: 0, images: [] }}
      />,
    );
    expect(screen.queryByTestId('chat-attachment')).toBeNull();

    rerender(
      <AIChatPanel
        chat={[]}
        busy={false}
        error={null}
        onSend={onSend}
        onUploadImage={vi.fn()}
        imageRestore={{
          nonce: 1,
          images: [{ s3_key: 'chat-input/p1/abc', mime: 'image/png', previewUrl: 'blob:restored-1' }],
        }}
      />,
    );
    const thumb = await screen.findByTestId('chat-attachment');
    expect(thumb.getAttribute('data-status')).toBe('ready');

    // One tap re-sends the SAME S3 ref (no re-upload happened).
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'try again' } });
    fireEvent.click(screen.getByTestId('chat-send'));
    expect(onSend).toHaveBeenCalledWith('try again', {
      images: [{ s3_key: 'chat-input/p1/abc', mime: 'image/png', previewUrl: 'blob:restored-1' }],
    });
  });

  it('renders attached pictures in the kid bubble from the local preview URL', () => {
    const chat: ChatItem[] = [
      { id: 'k1', role: 'kid', text: 'use this', images: [{ previewUrl: 'blob:kid-1' }] },
    ];
    render(<AIChatPanel chat={chat} busy={false} error={null} onSend={vi.fn()} />);
    const imgs = screen.getAllByTestId('kid-bubble-image');
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute('src')).toBe('blob:kid-1');
  });
});

// Draft persistence — the unsent composer text is LIFTED to the owner (Workspace)
// so it survives the ChatPane unmounting when the kid flips split tabs (chat ↔
// assets) or layout modes while still in the project. This harness stands in for
// Workspace: it owns the draft and toggles the panel's mount, exactly like the
// split-tab ternary does.
describe('AIChatPanel — lifted composer draft survives a remount', () => {
  function DraftHarness() {
    const [draft, setDraft] = useState('');
    const [showChat, setShowChat] = useState(true);
    return (
      <div>
        <button type="button" data-testid="toggle-tab" onClick={() => setShowChat((v) => !v)}>
          toggle
        </button>
        {showChat ? (
          <AIChatPanel
            chat={[]}
            busy={false}
            error={null}
            onSend={vi.fn()}
            draft={draft}
            onDraftChange={setDraft}
          />
        ) : (
          <div data-testid="assets-stub">assets</div>
        )}
      </div>
    );
  }

  it('keeps the unsent text after switching to another tab and back', () => {
    render(<DraftHarness />);

    // Kid types a message but does NOT send it.
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'make it rainbow' } });
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('make it rainbow');

    // Flip to the Assets tab (unmounts the composer) …
    fireEvent.click(screen.getByTestId('toggle-tab'));
    expect(screen.queryByTestId('chat-input')).toBeNull();
    expect(screen.getByTestId('assets-stub')).toBeTruthy();

    // … and back to Chat: the draft is still there, not lost.
    fireEvent.click(screen.getByTestId('toggle-tab'));
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('make it rainbow');
  });

  it('reflects the controlled draft and reports edits through onDraftChange', () => {
    const onDraftChange = vi.fn();
    render(
      <AIChatPanel
        chat={[]}
        busy={false}
        error={null}
        onSend={vi.fn()}
        draft="hello there"
        onDraftChange={onDraftChange}
      />,
    );
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('hello there');
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'hello world' } });
    expect(onDraftChange).toHaveBeenCalledWith('hello world');
  });

  it('clears the lifted draft on send', () => {
    const onSend = vi.fn();
    function SendHarness() {
      const [draft, setDraft] = useState('ready to go');
      return (
        <AIChatPanel
          chat={[]}
          busy={false}
          error={null}
          onSend={onSend}
          draft={draft}
          onDraftChange={setDraft}
        />
      );
    }
    render(<SendHarness />);
    fireEvent.click(screen.getByTestId('chat-send'));
    expect(onSend).toHaveBeenCalledWith('ready to go', undefined);
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).value).toBe('');
  });
});
