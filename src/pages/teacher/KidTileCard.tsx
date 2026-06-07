import clsx from 'clsx';
import { Link } from 'react-router-dom';

import type { KidStatus, KidTile } from './classApi';

const STATUS_LABEL: Record<KidStatus, string> = {
  running: 'Running',
  error: 'Has error',
  idle: 'Idle — maybe stuck',
  'share-pending': 'Share pending',
};

const STATUS_STICKER: Record<KidStatus, string> = {
  running: 'sticker-mint',
  error: 'sticker-coral',
  idle: 'sticker-sunshine',
  'share-pending': 'sticker-sky',
};

interface Props {
  classId: string;
  tile: KidTile;
  onPushHint: (kidId: string) => void;
  onToggleTakeOver: (tile: KidTile) => void;
}

/** One kid on the class dashboard: live thumbnail + status + needs-help flag +
 *  the per-kid teacher actions (zoom to live view, push a hint, take over). */
export function KidTileCard({ classId, tile, onPushHint, onToggleTakeOver }: Props) {
  return (
    <div
      data-testid="kid-tile"
      data-kid-id={tile.kidId}
      data-status={tile.status}
      className={clsx(
        'card-base relative flex flex-col gap-3 p-4',
        tile.needsHelp && 'ring-2 ring-brand-coral',
      )}
    >
      {tile.needsHelp && (
        <span
          data-testid="needs-help-flag"
          className="absolute -right-2 -top-2 sticker-coral"
          title="Raised their hand"
        >
          ✋ Needs help
        </span>
      )}

      {/* Live read-only thumbnail (a captured canvas frame; no PII). */}
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-ink/90">
        {tile.thumbnailDataUrl ? (
          <img
            src={tile.thumbnailDataUrl}
            alt=""
            className="h-full w-full object-contain"
            data-testid="kid-tile-thumb"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[12px] font-semibold text-white/50">
            no preview yet
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold text-ink">{tile.nickname}</span>
        <span data-testid="kid-tile-status" className={STATUS_STICKER[tile.status]}>
          {STATUS_LABEL[tile.status]}
        </span>
      </div>

      {tile.takenOver && (
        <span className="text-[12px] font-semibold text-brand-coral">🕹 You have the wheel</span>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          to={`/teacher/classes/${classId}/kids/${tile.kidId}`}
          data-testid="kid-zoom"
          className="btn-pill-ghost text-[13px]"
        >
          Zoom in
        </Link>
        <button
          type="button"
          data-testid="push-hint"
          className="btn-pill-ghost text-[13px]"
          onClick={() => onPushHint(tile.kidId)}
        >
          Push hint
        </button>
        <button
          type="button"
          data-testid="teacher-takeover"
          className="btn-pill-ghost text-[13px]"
          onClick={() => onToggleTakeOver(tile)}
        >
          {tile.takenOver ? 'Give back' : 'Take over'}
        </button>
      </div>
    </div>
  );
}
