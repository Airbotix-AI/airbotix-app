// @vitest-environment jsdom
//
// FE1 — the teacher's "what shall we do next?" option chips (§11.4 / D-PAP-06):
// a settled agent bubble carrying `nextSteps` renders tappable chips, and tapping
// one sends its prompt as the next turn.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AIChatPanel } from './AIChatPanel';
import type { ChatImageRef } from '../../code/codeApi';
import type { ChatItem } from './useGameAgent';

afterEach(cleanup);

describe('AIChatPanel — next-step option chips', () => {
  const chat: ChatItem[] = [
    {
      id: 'a1',
      role: 'agent',
      text: 'Your player can jump now! 🦘',
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
