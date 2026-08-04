// Website Studio srcdoc builder (creative-code-studio-website-prd). Asserts the
// runtime contract the backend's Web Critter prompt teaches: page selection +
// fallbacks, css/js reference inlining with sourceURL + line mapping, server.js
// injected FIRST among kid scripts, db hydration from data/**.json (+ dbState
// override), the fetch/app/nav shims + CSP second fence, and asset inlining.

import { describe, expect, it } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import {
  buildSitePreview,
  isSiteNavigateMessage,
  resolveErrorLoc,
  SITE_HOME_PAGE,
} from './buildSitePreview';

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});
const asset = (path: string, base64: string): VfsFile => ({
  path,
  content: base64,
  kind: 'asset',
  size: base64.length,
});

const page = (body: string, head = '') =>
  `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n${head}</head>\n<body>\n${body}\n</body>\n</html>\n`;

const SITE: VfsFile[] = [
  text('index.html', page('<h1>Home</h1>\n<script src="server.js"></script>\n<script src="script.js"></script>', '<link rel="stylesheet" href="style.css">\n')),
  text('about.html', page('<h2>About</h2>', '<link rel="stylesheet" href="style.css">\n')),
  text('style.css', 'body{color:tomato}'),
  text('script.js', "console.log('page');\nloadPets();"),
  text('server.js', "app.get('/api/pets', (req, res) => res.json(db.pets));"),
  text('data/pets.json', '[{"id":1,"name":"Biscuit"}]'),
];

describe('buildSitePreview — page selection', () => {
  it('renders index.html by default', () => {
    const { srcDoc, currentPage } = buildSitePreview(SITE);
    expect(currentPage).toBe('index.html');
    expect(srcDoc).toContain('<h1>Home</h1>');
  });

  it('opts.page picks another VFS page as the document', () => {
    const { srcDoc, currentPage } = buildSitePreview(SITE, { page: 'about.html' });
    expect(currentPage).toBe('about.html');
    expect(srcDoc).toContain('<h2>About</h2>');
    expect(srcDoc).not.toContain('<h1>Home</h1>');
  });

  it('an unknown page falls back to index.html', () => {
    const { srcDoc, currentPage } = buildSitePreview(SITE, { page: 'nope.html' });
    expect(currentPage).toBe('index.html');
    expect(srcDoc).toContain('<h1>Home</h1>');
  });

  it('no index.html at all renders a friendly kid-facing empty state', () => {
    const { srcDoc, currentPage, scriptRanges } = buildSitePreview([text('style.css', 'x')]);
    expect(currentPage).toBe(SITE_HOME_PAGE);
    expect(srcDoc).toContain('No pages yet!');
    expect(srcDoc).toContain('index.html');
    expect(scriptRanges).toEqual([]);
  });
});

describe('buildSitePreview — reference inlining', () => {
  it('inlines <link rel="stylesheet"> as a <style> with the VFS css', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).toContain('<style>body{color:tomato}</style>');
    expect(srcDoc).not.toContain('href="style.css"');
  });

  it('inlines <script src> as a classic script carrying //# sourceURL', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).toContain("console.log('page');");
    expect(srcDoc).toContain('//# sourceURL=script.js');
    expect(srcDoc).not.toContain('src="script.js"');
  });

  it('a missing referenced file becomes a console.error, never a crash', () => {
    const files = [text('index.html', page('<script src="ghost.js"></script>'))];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).toContain('Missing file \\"ghost.js\\"');
    expect(srcDoc).toContain('console.error');
  });

  it('an external script URL is neutralized into a console.error (never loads)', () => {
    const files = [text('index.html', page('<script src="https://evil.example/x.js"></script>'))];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).not.toContain('src="https://evil.example/x.js"');
    expect(srcDoc).toContain('console.error');
  });

  it('a missing stylesheet becomes a console.error too', () => {
    const files = [text('index.html', page('', '<link rel="stylesheet" href="ghost.css">\n'))];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).toContain('Missing file \\"ghost.css\\"');
  });
});

describe('buildSitePreview — server.js is FIRST among kid scripts', () => {
  it('injects server.js before the page scripts and drops the page reference (no double-run)', () => {
    const { srcDoc } = buildSitePreview(SITE);
    const serverAt = srcDoc.indexOf("app.get('/api/pets'");
    const pageAt = srcDoc.indexOf("console.log('page');");
    expect(serverAt).toBeGreaterThan(-1);
    expect(pageAt).toBeGreaterThan(-1);
    expect(serverAt).toBeLessThan(pageAt);
    // The page's own <script src="server.js"> reference must not run it twice.
    expect(srcDoc.split("app.get('/api/pets'").length - 1).toBe(1);
  });

  it('injects server.js even when the page never references it', () => {
    const files = [text('index.html', page('<h2>About</h2>')), SITE[4]];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).toContain("app.get('/api/pets'");
    expect(srcDoc).toContain('//# sourceURL=server.js');
  });
});

describe('buildSitePreview — the site runtime shim + CSP fence', () => {
  it('embeds the db seeds from data/**.json keyed by filename', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).toContain('"pets"');
    expect(srcDoc).toContain('data/pets.json');
    expect(srcDoc).toContain('[{\\"id\\":1,\\"name\\":\\"Biscuit\\"}]');
    // Hydration is runtime-tolerant: a bad seed console.errors and is skipped.
    expect(srcDoc).toContain('it is not valid JSON');
  });

  it('nested data/**.json seeds key on the filename (no directory)', () => {
    const files = [text('index.html', page('')), text('data/shop/items.json', '[1]')];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).toContain('{key:"items",path:"data/shop/items.json"');
  });

  it('a seed containing </script> cannot break out of the shim tag', () => {
    const files = [
      text('index.html', page('')),
      text('data/evil.json', '["</script><script>alert(1)</script>"]'),
    ];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).not.toContain('<script>alert(1)');
    expect(srcDoc).toContain('\\u003c/script>');
  });

  it('opts.dbState REPLACES the initial db (carried across page navigations)', () => {
    const { srcDoc } = buildSitePreview(SITE, { dbState: { pets: [{ id: 9 }] } });
    expect(srcDoc).toContain('var carried = {"pets":[{"id":9}]}');
  });

  it('without dbState the carried db is null (seeds hydrate)', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).toContain('var carried = null');
  });

  it('ships the app/fetch/nav shims before any kid script', () => {
    const { srcDoc } = buildSitePreview(SITE);
    const shimAt = srcDoc.indexOf('window.app = {');
    expect(shimAt).toBeGreaterThan(-1);
    expect(srcDoc).toContain('window.fetch = function');
    expect(srcDoc).toContain('__airbotixSiteNavigate');
    expect(srcDoc).toContain('the sandbox blocks the outside internet');
    expect(shimAt).toBeLessThan(srcDoc.indexOf("app.get('/api/pets'"));
  });

  it('carries the connect-src none CSP meta as a second fence', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).toContain(
      `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'">`,
    );
  });
});

describe('buildSitePreview — asset inlining', () => {
  const dog = asset('assets/dog.png', 'AAAA');

  it('rewrites quoted asset paths in the page HTML to data: URLs', () => {
    const files = [text('index.html', page('<img src="assets/dog.png">')), dog];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).toContain('src="data:image/png;base64,AAAA"');
  });

  it('rewrites asset paths inside inlined css and js', () => {
    const files = [
      text('index.html', page('<script src="script.js"></script>', '<link rel="stylesheet" href="style.css">\n')),
      text('style.css', "body{background-image:url('assets/dog.png')}"),
      text('script.js', "const pic = 'assets/dog.png';"),
      dog,
    ];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).toContain("url('data:image/png;base64,AAAA')");
    expect(srcDoc).toContain("const pic = 'data:image/png;base64,AAAA';");
  });

  it('inlines virtualAssets (class shared assets) exactly like VFS assets', () => {
    const files = [text('index.html', page('<img src="assets/class/hero.png">'))];
    const virtual = asset('assets/class/hero.png', 'BBBB');
    const { srcDoc } = buildSitePreview(files, { virtualAssets: [virtual] });
    expect(srcDoc).toContain('src="data:image/png;base64,BBBB"');
  });
});

describe('buildSitePreview — scriptRanges map syntax errors back to kid files', () => {
  it('ranges cover each inlined script, content starting ON the <script> line', () => {
    const { srcDoc, scriptRanges } = buildSitePreview(SITE);
    const byPath = Object.fromEntries(scriptRanges.map((r) => [r.path, r]));
    expect(byPath['server.js']).toBeDefined();
    expect(byPath['script.js']).toBeDefined();
    // script.js is two lines long.
    expect(byPath['script.js'].end - byPath['script.js'].start).toBe(1);
    // The range's start line really is where the content begins in the srcdoc.
    const lines = srcDoc.split('\n');
    expect(lines[byPath['script.js'].start - 1]).toContain("console.log('page');");
    expect(lines[byPath['server.js'].start - 1]).toContain("app.get('/api/pets'");
  });

  it('resolveErrorLoc maps a srcdoc line back to the kid file:line', () => {
    const { scriptRanges } = buildSitePreview(SITE);
    const range = scriptRanges.find((r) => r.path === 'script.js')!;
    const loc = resolveErrorLoc(
      { file: 'about:srcdoc', line: range.start + 1, col: 3 },
      scriptRanges,
    );
    expect(loc).toEqual({ file: 'script.js', line: 2, col: 3 });
  });

  it('a loc already carrying the kid file (sourceURL) passes through', () => {
    const { scriptRanges } = buildSitePreview(SITE);
    const loc = { file: 'server.js', line: 1, col: 1 };
    expect(resolveErrorLoc(loc, scriptRanges)).toEqual(loc);
  });
});

describe('isSiteNavigateMessage', () => {
  it('accepts the nav shim message and rejects other shapes', () => {
    expect(isSiteNavigateMessage({ __airbotixSiteNavigate: true, path: 'about.html', db: null })).toBe(true);
    expect(isSiteNavigateMessage({ __airbotixSiteNavigate: true })).toBe(false);
    expect(isSiteNavigateMessage({ __airbotixConsole: true })).toBe(false);
    expect(isSiteNavigateMessage(null)).toBe(false);
  });
});
