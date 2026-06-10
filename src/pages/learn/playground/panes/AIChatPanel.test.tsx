// @vitest-environment jsdom
//
// FE1 — the teacher's "what shall we do next?" option chips (§11.4 / D-PAP-06):
// a settled agent bubble carrying `nextSteps` renders tappable chips, and tapping
// one sends its prompt as the next turn.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AIChatPanel } from './AIChatPanel';
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
      { id: 's1', key: 'Aliens.js', label: 'Adding Aliens ✍️', status: 'active' as const, startedAt: Date.now() - 2000 },
    ],
  };

  it('renders the WorkingCard (with the real step) for a pending turn when progress is set', () => {
    render(<AIChatPanel chat={pendingChat} busy progress={progress} error={null} onSend={vi.fn()} />);
    expect(screen.getByTestId('working-card')).toBeTruthy();
    expect(screen.getByText('Adding Aliens ✍️')).toBeTruthy();
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
