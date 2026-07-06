// @vitest-environment jsdom
// ReadOnlyGameFrame — the bare, read-only game canvas shared by the public play
// host (/play/:shareId) and the class wall. The load-bearing contract here is
// that the `engine` prop selects the RIGHT vendored engine global: a 3D game must
// build on three.js, NOT Phaser (learn-game-studio-3d-prd.md D-3D-01). Regression:
// the read-only frame ignored the engine and always built Phaser, so a shared 3D
// game silently rendered nothing.

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { ReadOnlyGameFrame } from './ReadOnlyGameFrame';

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

afterEach(cleanup);

describe('ReadOnlyGameFrame engine selection', () => {
  const FILES = [text('main.js', 'new Phaser.Game({});')];

  it('defaults to the 2D Phaser engine when no engine prop is given (back-compat)', () => {
    render(<ReadOnlyGameFrame files={FILES} testId="frame" />);
    const srcDoc = screen.getByTestId('frame').getAttribute('srcdoc') ?? '';
    expect(srcDoc).toMatch(/\/vendor\/phaser-/);
    expect(srcDoc).not.toContain('/vendor/three-');
  });

  it('builds on three.js when engine="three" — the 3D global, not Phaser', () => {
    render(<ReadOnlyGameFrame files={FILES} engine="three" testId="frame" />);
    const srcDoc = screen.getByTestId('frame').getAttribute('srcdoc') ?? '';
    expect(srcDoc).toMatch(/\/vendor\/three-/);
    expect(srcDoc).not.toContain('/vendor/phaser-');
  });

  it('keeps the strict opaque-origin sandbox (no allow-same-origin) on either engine', () => {
    render(<ReadOnlyGameFrame files={FILES} engine="three" testId="frame" />);
    const sandbox = screen.getByTestId('frame').getAttribute('sandbox') ?? '';
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
  });
});
