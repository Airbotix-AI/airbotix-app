// Syntax-error location resolution (playground self-fix context): a script that
// fails to PARSE never gets its `//# sourceURL` applied, so the browser reports
// the error against the srcdoc document. buildGamePreview returns each script's
// line range inside the srcdoc; resolveErrorLoc maps the document line back to
// the kid's file:line — the location the console, jump-to-error, and the AI
// self-fix round-trip all rely on.
import { describe, expect, it } from 'vitest';
import { buildGamePreview, resolveErrorLoc } from './buildGamePreview';
import type { VfsFile } from '../code/codeApi';

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const FILES: VfsFile[] = [
  text('src/scenes/Game.js', 'class Game {\n  go() {}\n}\n'), // 4 source lines (incl. trailing)
  text('main.js', 'new Game();\nstart();'), // entry — injected LAST
];

describe('buildGamePreview script ranges', () => {
  it('maps each script range to the file content at that srcdoc line', () => {
    const { srcDoc, scriptRanges } = buildGamePreview(FILES);
    const docLines = srcDoc.split('\n');
    expect(scriptRanges.map((r) => r.path)).toEqual(['src/scenes/Game.js', 'main.js']);
    for (const range of scriptRanges) {
      const file = FILES.find((f) => f.path === range.path)!;
      const fileLines = file.content.split('\n');
      // First line rides on the `<script>` tag line; every later line matches exactly.
      expect(docLines[range.start - 1].endsWith(fileLines[0])).toBe(true);
      for (let i = 1; i < fileLines.length; i++) {
        expect(docLines[range.start - 1 + i]).toBe(fileLines[i]);
      }
      expect(range.end - range.start + 1).toBe(fileLines.length);
    }
  });
});

describe('resolveErrorLoc', () => {
  const { scriptRanges } = buildGamePreview(FILES);

  it('passes a kid-file loc through unchanged (sourceURL applied — runtime errors)', () => {
    const loc = { file: 'main.js', line: 2, col: 1 };
    expect(resolveErrorLoc(loc, scriptRanges)).toEqual(loc);
  });

  it('maps an about:srcdoc line inside a script back to the kid file:line', () => {
    const game = scriptRanges[0];
    const doc = { file: 'about:srcdoc', line: game.start + 1, col: 7 }; // file line 2
    expect(resolveErrorLoc(doc, scriptRanges)).toEqual({
      file: 'src/scenes/Game.js',
      line: 2,
      col: 7,
    });
  });

  it('drops a loc that points at host chrome (outside every script)', () => {
    expect(resolveErrorLoc({ file: 'about:srcdoc', line: 1, col: 1 }, scriptRanges)).toBeUndefined();
  });

  it('returns undefined for a missing loc', () => {
    expect(resolveErrorLoc(undefined, scriptRanges)).toBeUndefined();
  });
});
