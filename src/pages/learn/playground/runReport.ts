// RunReport v1 — FE mirror + the pure run collector (D-PAP-40/41).
//
// ⚠️ Keep the types, version, and caps in LOCKSTEP with
// platform-backend/src/code-sessions/run-report.ts (the zod source of truth).
//
// After an applied game turn the studio runs the game instrumented; this
// collector folds everything the sandbox reports (console lines, engine frame
// stats, asset outcomes, the run-probe canvas sample) into the structured
// RunReport the backend adjudicates. Pure — NO network in this file; posting
// lives in codeApi (`postRunReport`) and the loop in `panes/useVerification`.

import {
  ASSET_MANIFEST_PREFIX_CHARS,
  type AssetManifestEntry,
  type ConsoleLine,
  type GameEngine,
} from './buildGamePreview';
import { isFailureWarn } from './verifyRoundtrip';

export const RUN_REPORT_VERSION = 1;

// Caps (mirror the backend schema). Overflow is TRANSPARENT — `dropped` counts
// what didn't fit, never silent truncation.
export const MAX_REPORT_ERRORS = 6;
export const MAX_REPORT_WARNS = 4;
export const MAX_REPORT_REJECTIONS = 3;
export const MAX_REPORT_WINDOW_ERRORS = 3;
export const MAX_REPORT_LINE_CHARS = 300;
export const MAX_REPORT_ASSETS = 20;
const MAX_REPORT_PATH_CHARS = 200;
const MAX_REPORT_DETAIL_CHARS = 200;
const MAX_OBSERVED_MS = 120_000;
const MAX_FRAMES = 1_000_000;
const MAX_FPS = 1000;
const MAX_ATTEMPT = 10;
const MAX_CANVAS_SAMPLED = 4096;

/** How the console shim prefixes an unhandled promise rejection (buildPreview). */
const REJECTION_PREFIX = 'Unhandled promise:';

/** Per-asset load outcome. `missing-ref` = a raw path the inliner never rewrote
 *  (not in the VFS — the silent broken-GLB signature); `failed` = present but
 *  the loader errored. */
export interface AssetOutcome {
  path: string;
  status: 'loaded' | 'failed' | 'missing-ref' | 'unknown';
  detail?: string;
}

export interface RunReport {
  reportVersion: typeof RUN_REPORT_VERSION;
  /** 1-based verify attempt for this chain (run after the turn = 1; after fix #1 = 2…). */
  attempt: number;
  engine: GameEngine;
  /** How long the game was observed before the report was cut (ms). */
  observedMs: number;
  /** Engine frames advanced at least once. */
  booted: boolean;
  /** Cumulative engine frames seen in the window — 0 means frozen/dead. */
  framesAdvanced: number;
  fps: number;
  consoleErrors: string[];
  consoleWarns: string[];
  unhandledRejections: string[];
  windowErrors: string[];
  /** Entries the caps dropped — transparency, never silent truncation. */
  dropped: { errors: number; warns: number; rejections: number };
  assets: AssetOutcome[];
  canvas: { present: boolean; nonBlank: boolean | null; sampled: number };
  /** Set when the PROBE itself failed — the backend treats the run as
   *  inconclusive, never as a failure of the kid's game. */
  probeError?: string;
}

// ── Frame → parent message guards ───────────────────────────────────────────

/** The run probe's canvas sample (see RUN_PROBE in buildGamePreview). */
export interface RunProbeCanvas {
  present: boolean;
  nonBlank: boolean | null;
  sampled: number;
}

export function isRunReportMessage(
  data: unknown,
): data is { __airbotixRunReport: true; canvas: RunProbeCanvas } {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__airbotixRunReport' in data &&
    (data as { __airbotixRunReport: unknown }).__airbotixRunReport === true
  );
}

/** One loader-guard asset outcome (see THREE_LOADER_GUARD in buildGamePreview).
 *  `url` is truncated to the manifest prefix; `len` is the FULL url length. */
export interface AssetLoadMessage {
  url: string;
  len: number;
  ok: boolean;
  error?: string;
}

export function isAssetMessage(data: unknown): data is { __airbotixAsset: true } & AssetLoadMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    '__airbotixAsset' in data &&
    (data as { __airbotixAsset: unknown }).__airbotixAsset === true
  );
}

// ── The collector ────────────────────────────────────────────────────────────

export interface RunCollectorOptions {
  engine: GameEngine;
  /** 1-based chain attempt this run reports as. */
  attempt: number;
  /** Inlined-asset identities from buildGamePreview — maps a reported data: URL
   *  back to the kid's path (prefix + length match). */
  assetManifest: AssetManifestEntry[];
}

export interface RunCollector {
  /** Feed a captured console line (AFTER resolveErrorLoc, so locs are kid files). */
  feedConsole(line: ConsoleLine): void;
  /** Feed an engine stat tick (cumulative frames + current fps). */
  feedFrames(frames: number, fps: number): void;
  /** Feed a loader-guard asset outcome. */
  feedAsset(msg: AssetLoadMessage): void;
  /** Feed the run probe's canvas sample. */
  feedProbe(canvas: RunProbeCanvas): void;
  /** Record that the probe itself failed (first reason wins). */
  setProbeError(reason: string): void;
  /** Cut the report. The caller owns emit-once semantics. */
  finalize(observedMs: number): RunReport;
}

const clampInt = (n: number, min: number, max: number): number =>
  Math.min(Math.max(Math.floor(Number.isFinite(n) ? n : 0), min), max);

/**
 * Build a collector for one game run. Pure state-folding: classification,
 * caps + `dropped` accounting, de-duping, and manifest mapping all live here so
 * they're unit-testable without an iframe.
 */
export function createRunCollector(opts: RunCollectorOptions): RunCollector {
  const consoleErrors: string[] = [];
  const consoleWarns: string[] = [];
  const unhandledRejections: string[] = [];
  const windowErrors: string[] = [];
  const dropped = { errors: 0, warns: 0, rejections: 0 };
  const seen = new Set<string>();
  const assets: AssetOutcome[] = [];
  const assetPaths = new Set<string>();
  let framesAdvanced = 0;
  let fps = 0;
  let canvas: RunProbeCanvas = { present: false, nonBlank: null, sampled: 0 };
  let probeError: string | undefined;

  /** Clip → de-dupe (repeats merge, they're not "dropped") → cap (overflow counts). */
  const addLine = (bucket: string[], cap: number, key: string, text: string, onDrop: () => void) => {
    const clipped = text.slice(0, MAX_REPORT_LINE_CHARS);
    const dedupeKey = `${key}:${clipped}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    if (bucket.length >= cap) {
      onDrop();
      return;
    }
    bucket.push(clipped);
  };

  return {
    feedConsole(line) {
      const text = (line.text ?? '').trim();
      if (!text || text === 'ready') return; // the shim's handshake, never a bug
      if (line.level === 'error') {
        if (text.startsWith(REJECTION_PREFIX)) {
          addLine(unhandledRejections, MAX_REPORT_REJECTIONS, 'rej', text, () => {
            dropped.rejections += 1;
          });
          return;
        }
        if (line.loc) {
          // An uncaught window.onerror line — loc-resolved to the kid's file.
          // Its overflow counts under `dropped.errors` (error-class; the wire
          // shape has no window-error counter).
          addLine(
            windowErrors,
            MAX_REPORT_WINDOW_ERRORS,
            'win',
            `${text} (${line.loc.file}:${line.loc.line})`,
            () => {
              dropped.errors += 1;
            },
          );
          return;
        }
        addLine(consoleErrors, MAX_REPORT_ERRORS, 'err', text, () => {
          dropped.errors += 1;
        });
        return;
      }
      if (line.level === 'warn') {
        // Curated failure warns are PROMOTED to consoleErrors: the backend's
        // clean-run predicate treats warns as advisory, so a Phaser missing
        // texture (reported via console.warn) must land error-class or a broken
        // game would verify clean. Generic kid warns stay advisory.
        if (isFailureWarn(text)) {
          addLine(consoleErrors, MAX_REPORT_ERRORS, 'err', text, () => {
            dropped.errors += 1;
          });
          return;
        }
        addLine(consoleWarns, MAX_REPORT_WARNS, 'warn', text, () => {
          dropped.warns += 1;
        });
      }
    },

    feedFrames(frames, statFps) {
      framesAdvanced = Math.max(framesAdvanced, clampInt(frames, 0, MAX_FRAMES));
      fps = Math.min(Math.max(Number.isFinite(statFps) ? statFps : 0, 0), MAX_FPS);
    },

    feedAsset(msg) {
      const url = String(msg.url ?? '');
      let path: string;
      let status: AssetOutcome['status'];
      if (url.startsWith('data:')) {
        // Inlined VFS asset — map back to the kid's path by prefix+length. An
        // unmatched data: URL (constructed at runtime) keeps its truncated url
        // so the evidence isn't lost.
        const prefix = url.slice(0, ASSET_MANIFEST_PREFIX_CHARS);
        const hit = opts.assetManifest.find((m) => m.prefix === prefix && m.length === msg.len);
        path = (hit ? hit.path : url).slice(0, MAX_REPORT_PATH_CHARS);
        status = msg.ok ? 'loaded' : 'failed';
      } else if (/^https?:/i.test(url)) {
        path = url.slice(0, MAX_REPORT_PATH_CHARS);
        status = msg.ok ? 'loaded' : 'failed';
      } else {
        // A raw relative path the inliner never rewrote — it is NOT in the VFS,
        // the silent-missing-asset signature, regardless of what the fetch did.
        path = url.slice(0, MAX_REPORT_PATH_CHARS);
        status = 'missing-ref';
      }
      if (assetPaths.has(path) || assets.length >= MAX_REPORT_ASSETS) return;
      assetPaths.add(path);
      const detail = msg.error ? String(msg.error).slice(0, MAX_REPORT_DETAIL_CHARS) : undefined;
      assets.push({ path, status, ...(detail ? { detail } : {}) });
    },

    feedProbe(sample) {
      canvas = {
        present: sample.present === true,
        nonBlank: typeof sample.nonBlank === 'boolean' ? sample.nonBlank : null,
        sampled: clampInt(sample.sampled, 0, MAX_CANVAS_SAMPLED),
      };
    },

    setProbeError(reason) {
      if (probeError === undefined) probeError = reason.slice(0, MAX_REPORT_LINE_CHARS);
    },

    finalize(observedMs) {
      return {
        reportVersion: RUN_REPORT_VERSION,
        attempt: clampInt(opts.attempt, 1, MAX_ATTEMPT),
        engine: opts.engine,
        observedMs: clampInt(observedMs, 0, MAX_OBSERVED_MS),
        booted: framesAdvanced > 0,
        framesAdvanced,
        fps,
        consoleErrors: [...consoleErrors],
        consoleWarns: [...consoleWarns],
        unhandledRejections: [...unhandledRejections],
        windowErrors: [...windowErrors],
        dropped: { ...dropped },
        assets: [...assets],
        canvas: { ...canvas },
        ...(probeError !== undefined ? { probeError } : {}),
      };
    },
  };
}
