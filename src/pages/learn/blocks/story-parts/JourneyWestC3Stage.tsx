// Journey to the West · chapter three's shared three-page stage.
//
// Chapter three is the season's first multi-page journey, and every Part that
// runs it shows the SAME stage: one page on screen at a time — exactly what the
// runtime does — with the raft as its own layer under the monkey king, because
// asset bible §6 forbids baking it into a background and §2.4 forbids leaving
// his feet on open water.
//
// C3-P2 (the Story Hook) and C3-P3 (the page-model rehearsal) both render it, so
// it lives here rather than being copied into each page. `testIdPrefix` keeps
// each Part's own test ids (`jtw-c3p2-stage`, `jtw-c3p3-stage`, …) stable.

import { GRID_H, GRID_W } from '../blocksModel';
import type { SpriteState } from '../interpreter';
import {
  JTW_C3_MONKEY_KING_ID,
  JTW_C3_MONKEY_KING_SPRITE,
  JTW_C3_PAGE_ALTS,
  JTW_C3_PAGE_BACKGROUNDS,
  JTW_C3_RAFT_ID,
  JTW_C3_RAFT_SPRITE,
} from '../jtwC3Stage';

const percent = (value: number, span: number) => `${(value / (span - 1)) * 100}%`;

export function JourneyWestC3Stage({
  testIdPrefix,
  pageNumber,
  sprites,
  saying,
}: {
  /** Per-Part test id prefix, e.g. `jtw-c3p3` → `jtw-c3p3-stage`. */
  testIdPrefix: string;
  /** 1-based page number — the number a child reads on the Page block. */
  pageNumber: number;
  sprites: Record<string, SpriteState>;
  saying: string | null;
}) {
  const monkey = sprites[JTW_C3_MONKEY_KING_ID];
  const raft = sprites[JTW_C3_RAFT_ID];
  return (
    <div
      className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-hairline"
      data-testid={`${testIdPrefix}-stage`}
      data-page={pageNumber}
    >
      <img
        src={JTW_C3_PAGE_BACKGROUNDS[pageNumber - 1]}
        alt={JTW_C3_PAGE_ALTS[pageNumber - 1]}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {raft?.visible && (
        <img
          src={JTW_C3_RAFT_SPRITE}
          alt=""
          aria-hidden
          data-testid={`${testIdPrefix}-raft`}
          data-gx={raft.gx}
          data-gy={raft.gy}
          className="absolute w-[22%] -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
          style={{ left: percent(raft.gx, GRID_W), top: percent(raft.gy, GRID_H) }}
        />
      )}
      {monkey?.visible && (
        <img
          src={JTW_C3_MONKEY_KING_SPRITE}
          alt="Monkey King"
          data-testid={`${testIdPrefix}-monkey-king`}
          data-gx={monkey.gx}
          data-gy={monkey.gy}
          data-size={monkey.size}
          className="absolute w-[14%] -translate-x-1/2 -translate-y-full transition-all duration-200"
          style={{ left: percent(monkey.gx, GRID_W), top: percent(monkey.gy, GRID_H) }}
        />
      )}
      {saying && (
        <span
          data-testid={`${testIdPrefix}-say`}
          className="absolute left-1/2 top-[8%] max-w-[52%] -translate-x-1/2 rounded-2xl border border-hairline bg-canvas-pure px-3 py-1 text-[13px] font-semibold text-ink"
        >
          {saying}
        </span>
      )}
    </div>
  );
}
