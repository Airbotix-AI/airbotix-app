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

  it('the sandbox attribute is EXACTLY the studio flags — never widened, never narrowed', () => {
    // The public /play page and the class wall render THIS component; any drift
    // here (adding allow-same-origin/allow-forms, or dropping allow-scripts)
    // changes the public security boundary. Pin the exact string.
    render(<ReadOnlyGameFrame files={FILES} testId="frame" />);
    expect(screen.getByTestId('frame').getAttribute('sandbox')).toBe(
      'allow-scripts allow-pointer-lock allow-orientation-lock',
    );
  });

  it('a snapshot with overlay.html renders the overlay through the shared builder (public /play path)', () => {
    // ReadOnlyGameFrame uses the SAME buildGameSrcDoc as the studio, so a frozen
    // share snapshot that carries overlay.html gets its HUD/touch controls on
    // /play and the class wall with zero extra wiring — this is the share-path
    // proof for D-GAME13.
    const withOverlay = [
      ...FILES,
      text('overlay.html', '<button id="pause-btn" data-ui>Pause</button>'),
    ];
    render(<ReadOnlyGameFrame files={withOverlay} testId="frame" />);
    const srcDoc = screen.getByTestId('frame').getAttribute('srcdoc') ?? '';
    // NB: the sanitizer's DOMParser round-trip serializes the bare `data-ui`
    // attribute as `data-ui=""` — same semantics.
    expect(srcDoc).toContain('<div id="overlay"><button id="pause-btn" data-ui="">Pause</button></div>');
    expect(srcDoc).toContain('#overlay{position:fixed;inset:0;z-index:10;pointer-events:none');
  });
});
