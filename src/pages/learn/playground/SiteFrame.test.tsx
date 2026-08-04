// @vitest-environment jsdom
// SiteFrame — the Website Studio's sandboxed site host (creative-code-studio-
// website-prd). Asserts the strict sandbox + the load-bearing harness selectors
// (`iframe[data-site-frame]`, `site-nav-home`, `site-nav-page`), the nav-shim
// message flow (page switch carrying db state), Home preserving db, the runKey
// reset (db back to seeds, home page), and the console panel.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../code/codeApi';
import { SiteFrame } from './SiteFrame';

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const SITE: VfsFile[] = [
  text(
    'index.html',
    '<!doctype html>\n<html>\n<head></head>\n<body><h1>Home</h1><a href="about.html">About</a></body>\n</html>',
  ),
  text('about.html', '<!doctype html>\n<html>\n<head></head>\n<body><h2>About</h2></body>\n</html>'),
  text('server.js', "app.get('/api/pets', (req, res) => res.json(db.pets));"),
  text('data/pets.json', '[{"id":1}]'),
];

const frame = () => document.querySelector('iframe[data-site-frame]') as HTMLIFrameElement;
const srcdoc = () => frame().getAttribute('srcdoc') ?? '';

/** Fire a message as the in-frame shims would (jsdom posts have a null source,
 *  which the frame's own-source guard deliberately admits — same as GameFrame). */
const post = (data: unknown) => fireEvent(window, new MessageEvent('message', { data }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SiteFrame', () => {
  it('renders the strict sandboxed iframe with the load-bearing selectors', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    const el = frame();
    expect(el).toBeInTheDocument();
    // allow-scripts ONLY — never allow-same-origin / forms / top-navigation.
    expect(el).toHaveAttribute('sandbox', 'allow-scripts');
    expect(el).toHaveAttribute('title', 'Site');
    expect(srcdoc()).toContain('<h1>Home</h1>');
    expect(screen.getByTestId('site-nav-home')).toBeInTheDocument();
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
  });

  it('a __airbotixSiteNavigate message switches the page and carries the db through', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    expect(srcdoc()).toContain('var carried = null');

    post({ __airbotixSiteNavigate: true, path: 'about.html', db: { pets: [{ id: 1, adopted: true }] } });

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html');
    expect(srcdoc()).toContain('<h2>About</h2>');
    // The carried db is embedded into the new page's runtime — the site
    // "remembers" across the navigation.
    expect(srcdoc()).toContain('var carried = {"pets":[{"id":1,"adopted":true}]}');
  });

  it('navigating to a page that no longer exists falls back to index.html', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'ghost.html', db: null });
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(srcdoc()).toContain('<h1>Home</h1>');
  });

  it('Home returns to index.html PRESERVING the carried db state', () => {
    render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'about.html', db: { pets: [] } });
    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('about.html');

    fireEvent.click(screen.getByTestId('site-nav-home'));

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(srcdoc()).toContain('<h1>Home</h1>');
    // db is NOT reset by Home — only a restart (runKey) resets it.
    expect(srcdoc()).toContain('var carried = {"pets":[]}');
  });

  it('a runKey bump resets the db to its seeds and returns home', () => {
    const { rerender } = render(<SiteFrame files={SITE} runKey={1} />);
    post({ __airbotixSiteNavigate: true, path: 'about.html', db: { pets: [{ id: 7 }] } });
    expect(srcdoc()).toContain('var carried = {"pets":[{"id":7}]}');

    rerender(<SiteFrame files={SITE} runKey={2} />);

    expect(screen.getByTestId('site-nav-page')).toHaveTextContent('index.html');
    expect(srcdoc()).toContain('var carried = null'); // seeds hydrate afresh
  });

  it('renders captured console lines in the panel and wires "Fix this error"', () => {
    const onFixError = vi.fn();
    render(<SiteFrame files={SITE} runKey={1} showConsole onFixError={onFixError} />);

    post({ __airbotixConsole: true, level: 'error', text: 'db.pets is undefined' });

    expect(screen.getByText(/db\.pets is undefined/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /fix this error/i }));
    expect(onFixError).toHaveBeenCalledWith('db.pets is undefined');
  });

  it('reports console lines up through onConsole/onConsoleCount (pane wiring)', () => {
    const onConsole = vi.fn();
    const onConsoleCount = vi.fn();
    render(
      <SiteFrame files={SITE} runKey={1} onConsole={onConsole} onConsoleCount={onConsoleCount} />,
    );
    post({ __airbotixConsole: true, level: 'info', text: 'ready' });
    expect(onConsoleCount).toHaveBeenLastCalledWith(1);
    expect(onConsole).toHaveBeenLastCalledWith([
      expect.objectContaining({ level: 'info', text: 'ready' }),
    ]);
  });
});
