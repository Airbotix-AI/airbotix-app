import { useEffect, useMemo, useRef, useState } from 'react';

import type { VfsFile } from '../code/codeApi';
import { buildSitePreview, isSiteNavigateMessage, SITE_HOME_PAGE } from './buildSitePreview';
import { fetchPublicSource, queryPublicSiteDb } from './sharingApi';
import { useSiteBackendChannel, type SiteBackendTransport } from './siteBackendChannel';

interface ReadOnlySiteFrameProps {
  /** The frozen, read-only site VFS snapshot to render (public `/play`). */
  files: VfsFile[];
  /** The public share id whose per-share backend answers the frame's
   *  `db.query` / `sources.get` calls (D-WEB-22). No auth, no project id. */
  shareId: string;
  /** Stable label for the iframe (a11y); the visitor never sees kid PII. */
  title?: string;
  /** testid for the iframe so the public play host can target it. */
  testId?: string;
}

/**
 * The read-only WEBSITE play host — the site counterpart of `ReadOnlyGameFrame`
 * (D-WEB-22). A logged-out `/play/:shareId` visitor opens a kid's shared website
 * and can interact with it (adopt a pet, add a row) exactly like playing a game.
 *
 * It renders the frozen site through the SAME `buildSitePreview` runtime as the
 * studio `SiteFrame` — so the security posture is identical and lives in ONE
 * place: an opaque-origin iframe, `sandbox="allow-scripts"` ONLY (never
 * allow-same-origin), the studio-owned DOMParser skeleton, the deny-by-default
 * CSP, and the token-scoped sql/source postMessage channels. The ONLY difference
 * is the backend transport (`siteBackendChannel`): instead of the authed
 * per-project endpoints, `db.query` / `sources.get` are proxied to the no-auth
 * per-share endpoints, threading the opaque per-visitor `session` so a visitor's
 * writes land on THEIR ephemeral db clone (reset on reload), never the author's.
 *
 * NONE of the studio chrome (no dock/editor/console/Database window, no nav bar):
 * this is the bare public play surface. Multi-page nav still works via the same
 * nav shim — a link click posts to the parent, which rebuilds the target page.
 */
export function ReadOnlySiteFrame({ files, shareId, title = 'Website', testId }: ReadOnlySiteFrameProps) {
  const [page, setPage] = useState(SITE_HOME_PAGE);
  const { srcDoc } = useMemo(() => buildSitePreview(files, { page }), [files, page]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // The opaque per-visitor session (D-WEB-22): undefined until the FIRST db.query
  // reply mints one; persisted here per visit and echoed on every later call so
  // the visitor keeps their own isolated ephemeral clone of the frozen db.
  const sessionRef = useRef<string | undefined>(undefined);
  const transport = useMemo<SiteBackendTransport>(
    () => ({
      ready: !!shareId,
      query: async (sql, params) => {
        const { result, session } = await queryPublicSiteDb(
          shareId,
          sql,
          params,
          sessionRef.current,
        );
        sessionRef.current = session; // persist for subsequent calls (echoed above)
        return result;
      },
      getSource: (name, params) => fetchPublicSource(shareId, name, params),
    }),
    [shareId],
  );
  useSiteBackendChannel(iframeRef, transport);

  // Page-link clicks post a navigation to the parent (the opaque-origin srcdoc
  // cannot navigate itself); rebuild the target page. Nothing else rides along —
  // the db lives on the server (per-visitor clone).
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const frameWindow = iframeRef.current?.contentWindow;
      if (e.source != null && frameWindow != null && e.source !== frameWindow) return;
      if (isSiteNavigateMessage(e.data)) setPage(e.data.path);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      data-testid={testId}
      data-site-frame=""
      title={title}
      // Deliberately allow-scripts ONLY — the SAME strict flags as the studio
      // SiteFrame: NO allow-same-origin / allow-top-navigation / allow-forms.
      // Never weaken this (the CSP + opaque origin rest on it).
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      className="h-full w-full border-0"
    />
  );
}
