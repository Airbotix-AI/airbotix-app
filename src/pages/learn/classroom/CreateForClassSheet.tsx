import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Users, X } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { CREATE_TOOLS, type ProjectKind } from '../create/createTools';

/**
 * In-place "Create for this class" sheet (my-classes-prd §3.3, D-MC-9). Opens
 * inside the class hub — NOT a jump to the Create tab. Tapping a tool creates the
 * project, attaches it to the class (visibility=class_work, via the placement
 * endpoint) and opens it directly — so it lands in the studio AND shows under
 * "My work", with no intermediate naming page. Creative Code Studio is the exception:
 * it opens the prompt-first `/learn/playground/new?class=...` flow, and the
 * playground creates + attaches the game after the kid submits the initial prompt.
 *
 * The sheet filters the shared create-tool registry by the course's
 * `CoursePack.allowed_kinds` (D-MC-11). The personal Create tab remains
 * unfiltered.
 */
const lineOf = (typeTag: string): string =>
  typeTag === 'Creative' ? 'line_a_creative' : 'line_b_coding';

// Per-tool create config: kind + starter template + the EDITOR route to open
// directly. Blocks/Code open their builder; creative tools open the project page
// (where you add images/stories/voice/video). Creative Code Studio is prompt-first:
// the class id travels in the URL and the game project is created on prompt submit.
type ToolCfg = {
  title: string;
  line: string;
  kind?: string;
  template?: string;
  open: (id: string) => string;
  /**
   * The tool owns no project up front: navigate straight to it (carrying the
   * class) instead of POSTing /projects first. True for the prompt-first Game
   * Playground and for the session-based Music Stage, which mints its project
   * only when the kid presses 💾 Save.
   */
  noProject?: boolean;
};
const TOOL_CONFIG: Record<string, ToolCfg> = {
  '/learn/create/blocks': { title: 'My Blocks', line: 'line_b_coding', kind: 'blocks', template: 'blocks_blank', open: (id) => `/learn/blocks/${id}` },
  '/learn/create/code': { title: 'My Project', line: 'line_b_coding', kind: 'code', template: 'blank', open: (id) => `/learn/code/${id}` },
  '/learn/create/image': { title: 'My Picture', line: 'line_a_creative', open: (id) => `/learn/projects/${id}` },
  // Music Stage (the retired Music Maker's replacement) is session-based, not
  // project-based: there is no project to create up front, so a class row opens
  // the Stage itself. (music-stage-prd §2)
  '/learn/music': { title: 'My Song', line: 'line_a_creative', noProject: true, open: () => '/learn/music' },
  '/learn/create/voice': { title: 'My Voice', line: 'line_a_creative', open: (id) => `/learn/projects/${id}` },
  '/learn/create/video': { title: 'My Video', line: 'line_a_creative', open: (id) => `/learn/projects/${id}` },
};

// A second-level menu: a tool that owns sub-types (a `›` affordance in the sheet)
// shows them in-place instead of creating directly. The Code Studio tool splits
// into **Web Code** (today's blank `code` project → /learn/code/:id) and **Game
// Playground** (prompt-first `/learn/playground/new?class=...`; create +
// placement happen after the initial prompt). Tools without sub-types create as before.
interface SubType {
  /** Stable key for testids/keys (NOT user-facing). */
  id: string;
  emoji: string;
  title: string;
  desc: string;
  cfg: ToolCfg;
  projectKind: ProjectKind;
}
const CODE_SUBTYPES: SubType[] = [
  {
    id: 'web_code',
    emoji: '💻',
    title: 'Web Code',
    desc: 'A website, page, or tool. AI writes the code.',
    // Same shape as the Code tool's direct-create config (TOOL_CONFIG) — the
    // sub-menu just makes it an explicit sibling of Creative Code Studio.
    cfg: TOOL_CONFIG['/learn/create/code'],
    projectKind: 'code',
  },
  {
    id: 'game',
    emoji: '🎮',
    title: 'Creative Code Studio',
    desc: 'Vibe-code a 2D game and keep adding to it.',
    cfg: {
      title: 'My Game',
      line: 'line_b_coding',
      kind: 'game',
      open: () => '/learn/playground/new',
      noProject: true,
    },
    projectKind: 'game',
  },
];

// Tool path → its sub-types. Only the Code Studio tool has them today.
const SUBTYPES_BY_TOOL: Record<string, SubType[]> = {
  '/learn/create/code': CODE_SUBTYPES,
};

export function CreateForClassSheet({
  classId,
  className,
  allowedKinds,
  onClose,
}: {
  classId: string;
  className: string;
  allowedKinds?: ProjectKind[];
  onClose: () => void;
}) {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When set, the sheet shows the chosen tool's second-level menu (its sub-types)
  // instead of the tool list. `null` = the top-level tool list.
  const [subMenu, setSubMenu] = useState<(typeof CREATE_TOOLS)[number] | null>(null);
  const allowedSet = new Set<ProjectKind>(allowedKinds?.length ? allowedKinds : ['creative', 'code', 'game', 'blocks']);
  const allowedTools = CREATE_TOOLS.filter((tool) => {
    const subtypes = SUBTYPES_BY_TOOL[tool.to];
    if (subtypes) return subtypes.some((subtype) => allowedSet.has(subtype.projectKind));
    return allowedSet.has(tool.projectKind);
  });

  function allowedSubtypes(tool: (typeof CREATE_TOOLS)[number]) {
    return (SUBTYPES_BY_TOOL[tool.to] ?? []).filter((subtype) => allowedSet.has(subtype.projectKind));
  }

  // Tapping a tool with sub-types opens its second-level menu; a plain tool
  // creates directly with its default config.
  function pick(tool: (typeof CREATE_TOOLS)[number]) {
    if (busy) return;
    const subs = allowedSubtypes(tool);
    if (subs.length > 0) {
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
    if (cfg.noProject) {
      setError(null);
      // `open()` may already carry a query (the Stage deep-link does) — appending
      // a second "?" would silently drop the class.
      const to = cfg.open('new');
      nav(`${to}${to.includes('?') ? '&' : '?'}class=${encodeURIComponent(classId)}`);
      return;
    }
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
            {allowedSubtypes(subMenu).map((s) => (
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
            {allowedTools.map((t) => (
              <button
                key={t.to}
                type="button"
                disabled={busy}
                onClick={() => pick(t)}
                className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-canvas-pure p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-card-soft disabled:opacity-60"
                data-testid={allowedSubtypes(t).length > 0 ? 'create-tool-submenu' : 'create-tool'}
              >
                <span className={`grid h-12 w-12 place-items-center rounded-xl bg-grad-${t.color} text-[24px]`}>
                  {t.emoji}
                </span>
                <div className="flex-1">
                  <div className="text-[14px] font-bold text-ink">{t.title}</div>
                  <div className="text-[12px] text-slate2">{t.desc}</div>
                </div>
                <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-slate2">
                  {allowedSubtypes(t).length > 0 ? '›' : t.cost === 0 ? 'Free' : `${t.cost}★`}
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
