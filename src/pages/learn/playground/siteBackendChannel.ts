// The site runtime's PARENT-SIDE backend proxy — the ONE place a website's
// in-frame `db.query` / `sources.get` postMessages are answered (creative-code-
// studio-website-prd D-WEB-15 / D-WEB-19 / D-WEB-22).
//
// The in-frame shim (`buildSitePreview`) is byte-identical for the studio and
// the public play host — it posts `action:'sql'` / `action:'source'` to its
// parent and never holds a token. What DIFFERS is where the parent forwards
// those calls: the studio hits the AUTHED per-project endpoints
// (`/projects/:id/db/query`, `/projects/:id/sources/:name`), while the public
// `/play/:shareId` host hits the NO-AUTH per-share endpoints keyed by shareId
// with an opaque per-visitor session (D-WEB-22). That single difference is the
// `SiteBackendTransport` seam below — everything else (own-source guard,
// per-document token echo, param validation, in-flight caps) is shared, so the
// two frames keep ONE site runtime instead of duplicating the proxy.

import { useEffect, useRef, type RefObject } from 'react';

import { ApiError } from '@/lib/api';
import {
  isSiteSourceRequest,
  isSiteSqlRequest,
  MAX_SOURCE_INFLIGHT,
  type SiteSourceReply,
  type SiteSqlReply,
} from './buildSitePreview';
import type { SiteDbParam, SiteDbQueryResult, SiteSourceParam } from './panes/playgroundApi';

/** How many sql forwards may be in flight at once. An unawaited query loop in
 *  kid code must fail LOCALLY (kid-readably) instead of spraying backend calls.
 *  Well above anything a sane page needs (mirrors the frame shim's own cap). */
export const MAX_PENDING_SQL = 8;

/** The sql reply when the backend is not ready (a project-less studio session,
 *  or a share that hasn't resolved). Kid-readable, never a hang. */
const NO_BACKEND_SQL_ERROR =
  'Your database is not ready yet — it wakes up once your project is saved.';
/** The sources.get reply when the backend is not ready. Kid-readable. */
const NO_BACKEND_SOURCE_ERROR =
  'Data sources are not ready yet — they wake up once your project is saved.';

/** A bindable sql param element — mirrors the backend contract; anything else
 *  (objects, Dates, …) is rejected client-side with a kid-readable line
 *  instead of bouncing off the backend's schema as jargon. */
const isSqlParam = (p: unknown): p is SiteDbParam =>
  p === null || typeof p === 'string' || typeof p === 'number' || typeof p === 'boolean';

/** A sources.get param VALUE — the backend contract is scalars only (no null:
 *  a source param is either present or omitted). Anything else is rejected
 *  client-side with a kid-readable line, like db.query params. */
const isSourceParam = (v: unknown): v is SiteSourceParam =>
  typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean';

/**
 * The seam that varies between the studio and the public play host: WHERE the
 * site's `db.query` / `sources.get` calls are forwarded. Implementations wrap
 * either the authed per-project endpoints (studio) or the no-auth per-share
 * endpoints with the opaque per-visitor session (public host, D-WEB-22).
 *
 * `query` / `getSource` reject with an {@link ApiError} carrying the backend's
 * kid-readable message on failure (surfaced verbatim). `ready` is false only
 * for a backend that hasn't materialized yet (a project-less studio session);
 * the public host is always ready once the share resolved.
 */
export interface SiteBackendTransport {
  ready: boolean;
  query(sql: string, params: SiteDbParam[]): Promise<SiteDbQueryResult>;
  getSource(name: string, params: Record<string, SiteSourceParam>): Promise<{ data: unknown }>;
}

/**
 * Answer the site frame's `db.query` / `sources.get` postMessages by forwarding
 * them through `transport` and posting the reply back INTO the frame, echoing
 * the request's id + per-document token (so a reply landing after a srcdoc swap
 * — live rebuild / page nav — can never resolve the NEW document's same-id
 * query). Enforces the studio-side trust fences the frame shim cannot be relied
 * on for (the frame is untrusted; forged postMessages bypass its own caps):
 * own-source guard, scalar-param validation, and independent in-flight caps.
 *
 * Shared by `SiteFrame` (studio) and `ReadOnlySiteFrame` (public play host) —
 * the difference between them is entirely inside `transport`.
 */
export function useSiteBackendChannel(
  iframeRef: RefObject<HTMLIFrameElement>,
  transport: SiteBackendTransport,
): void {
  // Latest transport in a ref so a parent re-render never re-subscribes the
  // (stable) message listener; each answer reads the current transport.
  const transportRef = useRef(transport);
  transportRef.current = transport;
  // In-flight forwards (the caps) — refs, not state: they must mutate
  // synchronously inside the message handler.
  const pendingSqlRef = useRef(0);
  const pendingSourceRef = useRef(0);

  useEffect(() => {
    // One in-frame `db.query`: forward through the transport, post the reply
    // back echoing id + per-document token. The reply targets the frame window
    // AT REPLY TIME (a late reply after a srcdoc swap is dropped by the shim).
    const answerSql = async (id: number, token: string, sql: string, params: unknown[]) => {
      const reply = (r: Omit<SiteSqlReply, '__airbotixSiteSql' | 'id' | 'token'>) => {
        iframeRef.current?.contentWindow?.postMessage(
          { __airbotixSiteSql: true, id, token, ...r } satisfies SiteSqlReply,
          '*',
        );
      };
      if (!transportRef.current.ready) {
        reply({ ok: false, error: NO_BACKEND_SQL_ERROR });
        return;
      }
      // Untrusted wire data: every param element must be bindable, or the
      // backend's schema rejection would surface as kid-facing jargon.
      if (!params.every(isSqlParam)) {
        reply({
          ok: false,
          error: 'db.query params must be words, numbers, true/false or null.',
        });
        return;
      }
      // Local backpressure: an unawaited query loop fails here, kid-readably,
      // instead of spraying backend calls.
      if (pendingSqlRef.current >= MAX_PENDING_SQL) {
        reply({
          ok: false,
          error: `Too many database queries at once (over ${MAX_PENDING_SQL}) — await each db.query before starting the next.`,
        });
        return;
      }
      pendingSqlRef.current += 1;
      try {
        const result = await transportRef.current.query(sql, params as SiteDbParam[]);
        reply({ ok: true, result });
      } catch (err) {
        // The backend's DB_QUERY_ERROR message is kid-readable (the real
        // SQLite error) — surface it verbatim; anything else gets a calm fallback.
        const message =
          err instanceof ApiError && err.message
            ? err.message
            : 'Your database could not be reached — try again in a moment.';
        reply({ ok: false, error: message });
      } finally {
        pendingSqlRef.current -= 1;
      }
    };

    // One in-frame `sources.get` (D-WEB-19): forward through the transport,
    // reply back echoing id + per-document token (same guard as the sql channel).
    const answerSource = async (id: number, token: string, name: string, rawParams: unknown) => {
      const reply = (r: Omit<SiteSourceReply, '__airbotixSiteSource' | 'id' | 'token'>) => {
        iframeRef.current?.contentWindow?.postMessage(
          { __airbotixSiteSource: true, id, token, ...r } satisfies SiteSourceReply,
          '*',
        );
      };
      if (!transportRef.current.ready) {
        reply({ ok: false, error: NO_BACKEND_SOURCE_ERROR });
        return;
      }
      // Untrusted wire data: params must be a plain object of scalar values,
      // or the backend's schema rejection would surface as kid-facing jargon.
      const params =
        typeof rawParams === 'object' && rawParams !== null && !Array.isArray(rawParams)
          ? (rawParams as Record<string, unknown>)
          : {};
      if (!Object.values(params).every(isSourceParam)) {
        reply({
          ok: false,
          error: 'sources.get params must be words, numbers or true/false.',
        });
        return;
      }
      // Studio-side backpressure (the trust fence — the frame is untrusted and
      // its shim cap can be bypassed by forged postMessages).
      if (pendingSourceRef.current >= MAX_SOURCE_INFLIGHT) {
        reply({
          ok: false,
          error: `Too many data-source requests at once (over ${MAX_SOURCE_INFLIGHT}) — await each sources.get before starting the next.`,
        });
        return;
      }
      pendingSourceRef.current += 1;
      try {
        const { data } = await transportRef.current.getSource(
          name,
          params as Record<string, SiteSourceParam>,
        );
        reply({ ok: true, data });
      } catch (err) {
        // The backend's SOURCE_* messages are kid-readable — surface them
        // verbatim; anything else gets a calm fallback.
        const message =
          err instanceof ApiError && err.message
            ? err.message
            : 'That data source could not be reached — try again in a moment.';
        reply({ ok: false, error: message });
      } finally {
        pendingSourceRef.current -= 1;
      }
    };

    const onMessage = (e: MessageEvent) => {
      // Only THIS frame may query the db / a source (defence-in-depth: another
      // frame on the page must not steer the site). A null source (jsdom tests)
      // is not the cross-frame case.
      const frameWindow = iframeRef.current?.contentWindow;
      if (e.source != null && frameWindow != null && e.source !== frameWindow) return;
      if (isSiteSqlRequest(e.data)) {
        const params = Array.isArray(e.data.params) ? e.data.params : [];
        void answerSql(e.data.id, e.data.token, e.data.sql, params);
        return;
      }
      if (isSiteSourceRequest(e.data)) {
        void answerSource(e.data.id, e.data.token, e.data.name, e.data.params);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [iframeRef]);
}
