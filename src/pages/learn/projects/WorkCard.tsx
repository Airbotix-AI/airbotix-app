import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Grid3x3, Lock, MoreHorizontal, Plus, Share2, Trash2, Undo2, Users } from 'lucide-react';

import {
  STATUS_TAG,
  THUMB_BG,
  THUMB_ICON,
  isFinished,
  placementOf,
  resumeHref,
  type KidProject,
  type Placement,
} from './kidProject';
import type { ClassMineSummary } from '../classroom/classroomApi';

interface WorkCardProps {
  project: KidProject;
  /** Local game/blocks thumbnail (captured device-side; see ProjectsListPage). */
  localThumb?: string;
  /** Optional lesson sub-label (class hub "My work" tab). */
  subLabel?: string;
  /** Classes the kid can attach a personal project to (for "Use for a class"). */
  classes: ClassMineSummary[];
  /** Personal → Class work (attach). `classId` chosen from the picker. */
  onUseForClass: (classId: string) => void;
  /** On the wall → Class work. */
  onTakeOffWall: () => void;
  /** Class work → On the wall (existing wall-post path). */
  onShareWithClass: () => void;
  /** Class work / On the wall → Personal (destructive — detaches + privates). */
  onMoveToPersonal: () => void;
  /** Personal only — delete the project. */
  onDelete?: () => void;
}

const PLACEMENT_BADGE: Record<
  Placement,
  { bg: string; text: string; label: string; icon: typeof Lock } | null
> = {
  personal: null, // Personal needs no badge in My Works (the default home)
  class_work: { bg: 'bg-wash-sunshine', text: 'text-ink', label: 'Class work', icon: Users },
  on_wall: { bg: 'bg-wash-bubblegum', text: 'text-ink', label: 'On the wall', icon: Grid3x3 },
  // Honest label: a `public` work is internet-visible, not class-only. It exposes
  // no mutating kid actions (changing it is double-consent gated; my-classes-prd §11).
  public: { bg: 'bg-wash-sky', text: 'text-ink', label: 'Shared to the world', icon: Globe },
};

export function WorkCard(props: WorkCardProps) {
  const { project: p, localThumb, subLabel, classes } = props;
  const placement = placementOf(p);
  const badge = PLACEMENT_BADGE[placement];
  const status = isFinished(p) ? STATUS_TAG.finished : STATUS_TAG.working;
  const thumbSrc = p.thumbnail_s3_key ?? localThumb ?? null;
  const thumbBg = THUMB_BG[p.product_line] ?? 'bg-wash-sky';
  const thumbIcon = THUMB_ICON[p.product_line] ?? '🎨';

  const [menuOpen, setMenuOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !picking) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setPicking(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen, picking]);

  const BadgeIcon = badge?.icon;
  // `public` is double-consent gated: the kid surface offers NO placement actions
  // for it (my-classes-prd §11), so suppress the ⋯ menu entirely rather than open
  // an empty popover.
  const hasActions = placement !== 'public';

  return (
    <div ref={wrapRef} className="relative" data-testid="work-card">
      <Link
        to={resumeHref(p)}
        className="block overflow-hidden rounded-3xl bg-canvas-pure shadow-card-soft transition-transform hover:-translate-y-1"
        data-testid="work-open"
      >
        <div className={`flex aspect-[4/3] items-center justify-center overflow-hidden ${thumbBg}`}>
          {thumbSrc ? (
            <img src={thumbSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[36px] opacity-25">{thumbIcon}</span>
          )}
        </div>
        <div className="space-y-1 p-3">
          <h3 className="line-clamp-2 min-h-[2lh] text-[14px] font-bold leading-snug text-ink">
            {p.title}
          </h3>
          {subLabel && <div className="text-[12px] text-steel">{subLabel}</div>}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {badge && BadgeIcon && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.bg} ${badge.text}`}
              >
                <BadgeIcon size={12} /> {badge.label}
              </span>
            )}
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${status.bg} ${status.text}`}
            >
              {status.label}
            </span>
          </div>
        </div>
      </Link>

      {/* ⋯ kebab — share / move / delete (my-classes-prd §3.2). Hidden for
          `public`, which exposes no kid-mutable placement actions. */}
      {hasActions && (
        <button
          type="button"
          aria-label="More actions"
          onClick={() => {
            setMenuOpen((o) => !o);
            setPicking(false);
          }}
          className="absolute right-2.5 top-2.5 z-10 grid h-8 w-8 place-items-center rounded-full bg-canvas-pure/90 text-ink shadow-card-soft hover:bg-canvas-pure"
          data-testid="work-kebab"
        >
          <MoreHorizontal size={18} />
        </button>
      )}

      {menuOpen && !picking && (
        <div
          role="menu"
          className="absolute right-2.5 top-12 z-20 min-w-[220px] rounded-2xl border border-hairline bg-canvas-pure p-1.5 shadow-card-soft"
          data-testid="work-menu"
        >
          {placement === 'personal' && (
            <>
              <MenuItem
                icon={Plus}
                label="Use for a class"
                testid="action-use-for-class"
                onClick={() => setPicking(true)}
              />
              {props.onDelete && (
                <>
                  <div className="my-1 h-px bg-hairline" />
                  <MenuItem
                    icon={Trash2}
                    label="Delete"
                    testid="action-delete"
                    danger
                    onClick={() => {
                      setMenuOpen(false);
                      props.onDelete?.();
                    }}
                  />
                </>
              )}
            </>
          )}

          {placement === 'class_work' && (
            <>
              <MenuItem
                icon={Share2}
                label="Share with the whole class"
                testid="action-share-class"
                onClick={() => {
                  setMenuOpen(false);
                  props.onShareWithClass();
                }}
              />
              <MenuItem
                icon={Lock}
                label="Move to Personal"
                testid="action-move-personal"
                onClick={() => {
                  setMenuOpen(false);
                  props.onMoveToPersonal();
                }}
              />
            </>
          )}

          {placement === 'on_wall' && (
            <>
              <MenuItem
                icon={Undo2}
                label="Take off the wall"
                testid="action-take-off-wall"
                onClick={() => {
                  setMenuOpen(false);
                  props.onTakeOffWall();
                }}
              />
              <MenuItem
                icon={Lock}
                label="Move to Personal"
                testid="action-move-personal"
                onClick={() => {
                  setMenuOpen(false);
                  props.onMoveToPersonal();
                }}
              />
            </>
          )}
        </div>
      )}

      {/* "Use for a class" — class picker (my-classes-prd §3.3 consequence copy) */}
      {menuOpen && picking && (
        <div
          role="menu"
          className="absolute right-2.5 top-12 z-20 min-w-[240px] rounded-2xl border border-hairline bg-canvas-pure p-2.5 shadow-card-soft"
          data-testid="class-picker"
        >
          <p className="px-1 pb-2 text-[11px] font-semibold text-steel">
            Your teacher will be able to see it to help.
          </p>
          {classes.length === 0 ? (
            <p className="px-1 py-2 text-[12px] text-slate2">You’re not in any class yet.</p>
          ) : (
            classes.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setPicking(false);
                  props.onUseForClass(c.id);
                }}
                className="block w-full rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-ink hover:bg-surface"
                data-testid="class-picker-option"
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  testid,
  danger,
  onClick,
}: {
  icon: typeof Lock;
  label: string;
  testid: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      data-testid={testid}
      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold hover:bg-surface ${
        danger ? 'text-brand-coral' : 'text-ink'
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );
}
