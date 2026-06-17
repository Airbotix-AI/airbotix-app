import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, X } from 'lucide-react';

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

  async function make(tool: (typeof CREATE_TOOLS)[number]) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const cfg: ToolCfg = TOOL_CONFIG[tool.to] ?? {
      title: 'My Project',
      line: lineOf(tool.typeTag),
      open: (id) => `/learn/projects/${id}`,
    };
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
            <h2 className="text-[22px] font-bold text-ink">{className} · pick a tool</h2>
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

        <div className="space-y-2.5">
          {CREATE_TOOLS.map((t) => (
            <button
              key={t.to}
              type="button"
              disabled={busy}
              onClick={() => make(t)}
              className="flex w-full items-center gap-3 rounded-2xl border border-hairline bg-canvas-pure p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:shadow-card-soft disabled:opacity-60"
              data-testid="create-tool"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-xl bg-grad-${t.color} text-[24px]`}>
                {t.emoji}
              </span>
              <div className="flex-1">
                <div className="text-[14px] font-bold text-ink">{t.title}</div>
                <div className="text-[12px] text-slate2">{t.desc}</div>
              </div>
              <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-bold text-slate2">
                {t.cost === 0 ? 'Free' : `${t.cost}★`}
              </span>
            </button>
          ))}
        </div>

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
