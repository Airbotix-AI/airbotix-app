import { describe, expect, it } from 'vitest';

import { buildSrcDoc, isConsoleMessage } from './buildPreview';
import type { VfsFile } from './codeApi';

function vfs(path: string, content: string, kind = 'doc'): VfsFile {
  return { path, content, kind } as unknown as VfsFile;
}

describe('buildSrcDoc', () => {
  it('inlines html, css, and js into one sandboxed document', () => {
    const out = buildSrcDoc([
      vfs('index.html', '<h1>Hi</h1>'),
      vfs('style.css', 'body{color:red}'),
      vfs('script.js', 'console.log(1)'),
    ]);
    expect(out).toContain('<!doctype html>');
    expect(out).toContain('<style>body{color:red}</style>');
    expect(out).toContain('<h1>Hi</h1>');
    expect(out).toContain('console.log(1)');
    expect(out).toContain('__airbotixConsole'); // console-capture script injected
  });

  it('does not throw when the VFS is empty', () => {
    expect(() => buildSrcDoc([])).not.toThrow();
  });

  it('rewrites a VFS asset reference to an inlined data URL (no external leak)', () => {
    const out = buildSrcDoc([
      vfs('index.html', '<img src="cat.png">'),
      vfs('cat.png', 'data:image/png;base64,AAA', 'asset'),
    ]);
    expect(out).toContain('src="data:image/png;base64,AAA"');
    expect(out).not.toContain('src="cat.png"');
  });
});

describe('isConsoleMessage', () => {
  it('accepts a tagged console message from the preview iframe', () => {
    expect(isConsoleMessage({ __airbotixConsole: true, level: 'log', text: 'x' })).toBe(true);
  });

  it('rejects anything that is not a tagged console message', () => {
    expect(isConsoleMessage(null)).toBe(false);
    expect(isConsoleMessage({})).toBe(false);
    expect(isConsoleMessage({ __airbotixConsole: false })).toBe(false);
  });
});
