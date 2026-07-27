// Finite-step page-flow runs — the teaching trace behind multi-page stories.
//
// `BlocksRunner` runs ONE page: a `goto_page` block calls `onGotoPage` and ends
// that page's run, and the studio simply selects the target page. That is all a
// child needs while editing, but a chapter whose whole subject is "the exit
// number decides the next page" (Journey to the West C3, scene-specs
// "C3共享实现合同") has to be able to WATCH a project walk page → page → page and
// then say where the route first went wrong.
//
// This driver adds exactly that, without changing the interpreter:
//   * it enters a page, runs its 🚩 scripts through the REAL BlocksRunner, and
//     records where the tracked character entered and left;
//   * it follows the page the exit really asked for;
//   * it STOPS the moment the route re-enters a page it has already visited,
//     recording that visit but not running it again — so a Page 2 exit pointing
//     back at Page 1 reads as a stable `1 → 2 → 1`, never as an endless flicker;
//   * and it stops at `maxVisits` page entries no matter what, so a route that
//     loops through three or more pages is bounded too.
//
// Everything it reports is measured off the runner. Nothing here decides what a
// child got right; parts compare their own contract against this result.

import type { BlocksProject, Page } from './blocksModel';
import { BlocksRunner, startState, type SpriteHost, type SpriteState } from './interpreter';

/**
 * Teaching cap on page entries in one run. Six is more than any shipped
 * three-page story needs (a clean `1 → 2 → 3` takes three) and small enough
 * that a mistake ends in front of the child rather than spinning.
 */
export const PAGE_FLOW_MAX_VISITS = 6;

/** Why a page-flow run stopped. */
export type PageFlowStopReason =
  /** The last page ran to its End without asking for another page. */
  | 'end'
  /** The route asked for a page it had already visited (the teaching stop). */
  | 'loop'
  /** The route asked for a page number the project does not have. */
  | 'missing_page'
  /** `maxVisits` page entries happened first. */
  | 'budget'
  /** The caller called `stop()` (a component unmounted mid-run). */
  | 'stopped';

export interface PageFlowVisit {
  /** 1-based page number — the number a child reads on the Page block. */
  page: number;
  pageId: string;
  /** False for a page that was entered but deliberately not run (loop stop). */
  ran: boolean;
  /** Tracked character's cell as `gx-gy` when the page opened. */
  enterCell: string | null;
  /** Tracked character's cell when the page's run finished (null if not run). */
  exitCell: string | null;
  /** The page number this page's exit asked for; null when it ended instead. */
  exitTo: number | null;
}

export interface PageFlowRunResult {
  visits: PageFlowVisit[];
  /** Page numbers in visit order, e.g. `[1, 2, 1]`. */
  trace: number[];
  stoppedBy: PageFlowStopReason;
  /** The page whose exit sent the route back to an already-visited page. */
  firstLoopPage: number | null;
}

export interface PageFlowOptions {
  /** 1-based page to start from (default 1). */
  startPage?: number;
  /** Page-entry budget (default `PAGE_FLOW_MAX_VISITS`). */
  maxVisits?: number;
  /** Character whose cell is recorded per visit (default: the page's first). */
  trackCharacterId?: string;
  /** Stage callbacks — anything omitted is a no-op. `onGotoPage` is always ours. */
  host?: Partial<Omit<SpriteHost, 'onGotoPage'>>;
  /** Injectable timing, exactly as `BlocksRunner` takes it. */
  sleep?: (ms: number) => Promise<void>;
  /** Fired as each page opens, so a stage can swap background and sprites. */
  onPageEnter?: (page: number, pageId: string) => void;
}

const cell = (state: SpriteState | undefined): string | null =>
  state ? `${state.gx}-${state.gy}` : null;

/**
 * A page-flow run in progress. Held as an object so a component can `stop()` it
 * on unmount, the same way it would call `BlocksRunner.stopAll()`.
 */
export class PageFlowRunner {
  private stopped = false;
  private current: BlocksRunner | null = null;

  constructor(
    private readonly project: BlocksProject,
    private readonly options: PageFlowOptions = {},
  ) {
    if (project.pages.length === 0) {
      throw new Error('pageFlowRun: the project has no pages to run');
    }
  }

  /** Abandon the run; the in-flight page run is told to stop too. */
  stop(): void {
    this.stopped = true;
    this.current?.stopAll();
  }

  async run(): Promise<PageFlowRunResult> {
    const maxVisits = this.options.maxVisits ?? PAGE_FLOW_MAX_VISITS;
    const visits: PageFlowVisit[] = [];
    const seen = new Set<number>();
    let next: number | null = this.options.startPage ?? 1;
    let stoppedBy: PageFlowStopReason = 'end';
    let firstLoopPage: number | null = null;

    while (next !== null) {
      const page = this.project.pages[next - 1];
      if (!page) {
        stoppedBy = 'missing_page';
        break;
      }
      if (visits.length >= maxVisits) {
        stoppedBy = 'budget';
        break;
      }

      const revisit = seen.has(next);
      seen.add(next);
      this.options.onPageEnter?.(next, page.id);

      if (revisit) {
        // The teaching stop: record the re-entry, do NOT run the page again.
        visits.push({
          page: next,
          pageId: page.id,
          ran: false,
          enterCell: cell(this.startCellOf(page)),
          exitCell: null,
          exitTo: null,
        });
        stoppedBy = 'loop';
        break;
      }

      const visit = await this.runPage(next, page);
      visits.push(visit);
      if (this.stopped) {
        stoppedBy = 'stopped';
        break;
      }
      if (visit.exitTo === null) {
        stoppedBy = 'end';
        break;
      }
      if (seen.has(visit.exitTo) && firstLoopPage === null) firstLoopPage = next;
      next = visit.exitTo;
    }

    return {
      visits,
      trace: visits.map((visit) => visit.page),
      stoppedBy,
      firstLoopPage,
    };
  }

  /** Run ONE page's flag scripts and report where its exit points. */
  private async runPage(pageNumber: number, page: Page): Promise<PageFlowVisit> {
    const trackedId = this.trackedId(page);
    // A holder, not a `let`: the exit is written from inside the host callback.
    const exit: { to: number | null } = { to: null };
    const runner = new BlocksRunner(
      page,
      {
        onSprite: (charId, state, durationMs) =>
          this.options.host?.onSprite?.(charId, state, durationMs),
        onSay: (charId, text) => this.options.host?.onSay?.(charId, text),
        onNote: (noteId) => this.options.host?.onNote?.(noteId),
        onSound: (soundId) => this.options.host?.onSound?.(soundId),
        onStep: (charId, scriptId, blockIndex) =>
          this.options.host?.onStep?.(charId, scriptId, blockIndex),
        // The interpreter reports a 0-based page index; children read 1-based.
        onGotoPage: (pageIndex) => {
          exit.to = pageIndex + 1;
        },
      },
      this.options.sleep,
    );
    this.current = runner;
    const enterCell = trackedId ? cell(runner.state(trackedId)) : null;
    await runner.runFlag();
    this.current = null;
    return {
      page: pageNumber,
      pageId: page.id,
      ran: true,
      enterCell,
      exitCell: trackedId ? cell(runner.state(trackedId)) : null,
      exitTo: exit.to,
    };
  }

  private trackedId(page: Page): string | undefined {
    const wanted = this.options.trackCharacterId;
    if (!wanted) return page.characters[0]?.id;
    return page.characters.some((character) => character.id === wanted) ? wanted : undefined;
  }

  private startCellOf(page: Page): SpriteState | undefined {
    const trackedId = this.trackedId(page);
    const character = page.characters.find((candidate) => candidate.id === trackedId);
    return character ? startState(character) : undefined;
  }
}

/** Convenience wrapper for callers that never need to interrupt the run. */
export function runPageFlow(
  project: BlocksProject,
  options: PageFlowOptions = {},
): Promise<PageFlowRunResult> {
  return new PageFlowRunner(project, options).run();
}
