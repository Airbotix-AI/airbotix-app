import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, X } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { CREATE_TOOLS } from '../create/createTools';

/**
 * In-place "Create for this class" sheet (my-classes-prd §3.3, D-MC-9). Opens
 * inside the class hub — NOT a jump to the Create tab. Tapping a tool creates the
 * project, attaches it to the class (visibility=class_work, via the placement
 * endpoint) and opens it directly — so it lands in the studio AND shows under
 * "My work", with no intermediate naming page.
 *
 * TODO(D-MC-11): show only course-allowed kinds ∩ kid topic_limits once the
 * backend `CoursePack.allowed_kinds` exists. For now it shows the kid's full
 * permitted tool set, framed for class context.
 */
const lineOf = (typeTag: string): string =>
  typeTag === 'Creative' ? 'line_a_creative' : 'line_b_coding';

// Per-tool create config: kind + starter template + the EDITOR route to open
// directly. Blocks/Code open their builder; creative tools open the project page
// (where you add images/stories/voice/video).
type ToolCfg = { title: string; line: string; kind?: string; template?: string; open: (id: string) => string };
const TOOL_CONFIG: Record<string, ToolCfg> = {
  '/learn/create/blocks': { title: 'My Blocks', line: 'line_b_coding', kind: 'blocks', template: 'blocks_blank', open: (id) => `/learn/blocks/${id}` },
  '/learn/create/code': { title: 'My Project', line: 'line_b_coding', kind: 'code', template: 'blank', open: (id) => `/learn/code/${id}` },
  '/learn/create/image': { title: 'My Picture', line: 'line_a_creative', open: (id) => `/learn/projects/${id}` },
  '/learn/create/music': { title: 'My Song', line: 'line_a_creative', open: (id) => `/learn/projects/${id}` },
  '/learn/create/voice': { title: 'My Voice', line: 'line_a_creative', open: (id) => `/learn/projects/${id}` },
  '/learn/create/video': { title: 'My Video', line: 'line_a_creative', open: (id) => `/learn/projects/${id}` },
};

// A second-level menu: a tool that owns sub-types (a `›` affordance in the sheet)
// shows them in-place instead of creating directly. The Code Studio tool splits
// into **Web Code** (today's blank `code` project → /learn/code/:id) and **Game
// Playground** (a `phaser_blank` `game` project → /learn/playground/:id, matching
// `createGameProject` in PlaygroundApp). Tools without sub-types create as before.
interface SubType {
  /** Stable key for testids/keys (NOT user-facing). */
  id: string;
  emoji: string;
  title: string;
  desc: string;
  cfg: ToolCfg;
}
const CODE_SUBTYPES: SubType[] = [
  {
    id: 'web_code',
    emoji: '💻',
    title: 'Web Code',
    desc: 'A website, page, or tool. AI writes the code.',
    // Same shape as the Code tool's direct-create config (TOOL_CONFIG) — the
    // sub-menu just makes it an explicit sibling of Game Playground.
    cfg: TOOL_CONFIG['/learn/create/code'],
  },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Game Playground',
    desc: 'Vibe-code a 2D game and keep adding to it.',
    cfg: { title: 'My Game', line: 'line_b_coding', kind: 'game', template: 'phaser_blank', open: (id) => `/learn/playground/${id}` },
  },
];

// Tool path → its sub-types. Only the Code Studio tool has them today.
const SUBTYPES_BY_TOOL: Record<string, SubType[]> = {
  '/learn/create/code': CODE_SUBTYPES,
};

export function CreateForClassSheet({
  classId,
  className,
  onClose,
}: {
  classId: string;
  className: string;
  onClose: () => void;
}) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When set, the sheet shows the chosen tool's second-level menu (its sub-types)
  // instead of the tool list. `null` = the top-level tool list.
  const [subMenu, setSubMenu] = useState<(typeof CREATE_TOOLS)[number] | null>(null);

  // Tapping a tool with sub-types opens its second-level menu; a plain tool
  // creates directly with its default config.
  function pick(tool: (typeof CREATE_TOOLS)[number]) {
    if (busy) return;
    const subs = SUBTYPES_BY_TOOL[tool.to];
    if (subs) {
      setError(null);
      setSubMenu(tool);
      return;
    }
    void make(
      TOOL_CONFIG[tool.to] ?? {
        title: 'My Project',
        line: lineOf(tool.typeTag),
        open: (id) => `/learn/projects/${id}`,
      },
    );
  }

  // Create the project for `cfg`, attach it to the class, and open its editor —
  // the same flow whether `cfg` comes from a plain tool or a chosen sub-type.
  async function make(cfg: ToolCfg) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const project = await api<{ id: string }>('/projects', {
        method: 'POST',
        body: {
          title: cfg.title,
          product_line: cfg.line,
          ...(cfg.kind ? { kind: cfg.kind } : {}),
          ...(cfg.template ? { template: cfg.template } : {}),
        },
      });
      // Attach to the class -> class work (teacher-visible), shows under "My work".
      await api(`/projects/${project.id}/placement`, {
        method: 'PATCH',
        body: { action: 'use_for_class', class_id: classId },
      });
      nav(cfg.open(project.id)); // Blocks/Code -> their builder; creative -> project page.
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start that. Try again.');
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={busy ? undefined : onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="card-base w-full max-w-md"
        data-testid="create-for-class-sheet"
      >
        <div className="mb-2 flex items-start justify-between">
          <div>
            <div className="eyebrow eyebrow-bubblegum">Make for this class</div>
            <h2 className="text-[22px] font-bold text-ink">
              {subMenu ? `${subMenu.title} · pick one` : `${className} · pick a tool`}
            </h2>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full bg-surface text-slate2 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-wash-sunshine px-4 py-3">
          <Users size={18} className="text-ink" />
          <p className="text-[13px] text-ink">
            <b>Class work</b> — your teacher can see it to help.
          </p>
        </div>

        {error && (
          <div className="mb-3 rounded-2xl bg-wash-coral px-4 py-2.5 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}

        {subMenu ? (
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => setSubMenu(null)}
              className="flex items-center gap-1.5 text-[13px] font-bold text-brand-coral disabled:opacity-60"
              data-testid="create-subtool-back"
            >
              <ChevronLeft size={16} /> Back
            </button>
            {(SUBTYPES_BY_TOOL[subMenu.to] ?? []).map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => make(s.cfg)}
                className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-canvas-pure p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-card-soft disabled:opacity-60"
                data-testid="create-tool"
                data-subtype={s.id}
              >
                <span className={`grid h-12 w-12 place-items-center rounded-xl bg-grad-${subMenu.color} text-[24px]`}>
                  {s.emoji}
                </span>
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-ink">{s.title}</div>
                  <div className="text-[12px] text-slate2">{s.desc}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2.5">
            {CREATE_TOOLS.map((t) => (
              <button
                key={t.to}
                type="button"
                disabled={busy}
                onClick={() => pick(t)}
                className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-canvas-pure p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-card-soft disabled:opacity-60"
                data-testid={SUBTYPES_BY_TOOL[t.to] ? 'create-tool-submenu' : 'create-tool'}
              >
                <span className={`grid h-12 w-12 place-items-center rounded-xl bg-grad-${t.color} text-[24px]`}>
                  {t.emoji}
                </span>
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-ink">{t.title}</div>
                  <div className="text-[12px] text-slate2">{t.desc}</div>
                </div>
                <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-slate2">
                  {SUBTYPES_BY_TOOL[t.to] ? '›' : t.cost === 0 ? 'Free' : `${t.cost}★`}
                </span>
              </button>
            ))}
          </div>
        )}

        <p className="mt-3 text-[12px] text-slate2">
          For free-time projects, use the{' '}
          <Link to="/learn/create" className="font-bold text-brand-coral">
            Create tab
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
