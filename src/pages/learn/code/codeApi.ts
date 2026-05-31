// Code Studio data layer. Typed against learn-code-studio-prd.md §3/§4/§9 and
// platform-backend-api-spec.md §5.7 (projects) + §5.11 (llm proxy).
//
// The backend `tools` + `code-sessions` modules are NOT shipped yet (PRD §9
// marks them ⬜). Until they land we drive the VFS through the documented
// contract: GET/PUT project files via the `tools` service. Every call uses the
// shared `api` client so auth + refresh + error envelopes behave identically to
// the rest of the app. Where an endpoint 404s (backend not ready), callers fall
// back to a local seed so the UI still runs end-to-end.

import { api, ApiError } from '@/lib/api';

export const CODE_PROJECT_KIND = 'code' as const;

// Per-template seed prompt cost + first-build cost (PRD §3.3).
export const TEMPLATE_SEED_COST = 1;

export type CodeTemplateId = 'pet_website' | 'tiny_game' | 'doodle_pad' | 'beat_box' | 'blank';

export interface CodeTemplate {
  id: CodeTemplateId;
  emoji: string;
  title: string;
  desc: string;
  color: 'sky' | 'mint' | 'bubblegum' | 'sunshine' | 'coral';
}

export const CODE_TEMPLATES: CodeTemplate[] = [
  { id: 'pet_website', emoji: '🌐', title: 'My Pet Website', desc: 'A page all about your pet (real or made up).', color: 'sky' },
  { id: 'tiny_game', emoji: '🎮', title: 'Tiny Game', desc: 'A click-or-catch game you can keep adding to.', color: 'mint' },
  { id: 'doodle_pad', emoji: '✏️', title: 'Doodle Pad', desc: 'Draw with your mouse and pick colours.', color: 'bubblegum' },
  { id: 'beat_box', emoji: '🎵', title: 'Beat Box', desc: 'Tap buttons to make beats and sounds.', color: 'sunshine' },
  { id: 'blank', emoji: '✨', title: 'Blank Project', desc: 'Start from scratch and tell the AI your idea.', color: 'coral' },
];

// ── Virtual FS file model (PRD §3.2) ───────────────────────────────────────

export interface VfsFile {
  path: string; // project-relative, e.g. 'index.html' or 'images/cat.png'
  content: string; // text content, or a data: URL for binary assets
  kind: 'text' | 'asset';
  size: number;
}

export interface CodeProject {
  id: string;
  title: string;
  kind: typeof CODE_PROJECT_KIND;
  visibility: 'private' | 'class' | 'public';
  updated_at: string;
  created_at: string;
}

// ── Agent stream item rendering (PRD §4.4 / §8) ────────────────────────────

export type ToolName = 'read_file' | 'write_file' | 'edit_file' | 'list_dir';

export interface AgentPlan {
  plan_text: string;
  planned_tools: Array<{ tool: ToolName; path?: string }>;
}

export interface FileChange {
  path: string;
  before: string;
  after: string;
  lines_added: number;
  lines_removed: number;
}

export interface AgentTurnResult {
  summary: string;
  stars_charged: number;
  tools_fired: string[];
  changes: FileChange[];
  // Full updated VFS after the turn — the backend returns this so the preview
  // can re-render deterministically without a second round-trip.
  files: VfsFile[];
  plan?: AgentPlan;
}

// ── VFS endpoints (PRD §9 — `tools` service, additive to §5.7) ─────────────

const STARTER_FILES: Record<CodeTemplateId, VfsFile[]> = buildStarterFiles();

export async function listProjects(kidId: string): Promise<CodeProject[]> {
  try {
    const all = await api<Array<CodeProject & { kind?: string }>>(
      `/kids/${kidId}/projects?kind=${CODE_PROJECT_KIND}`,
    );
    return all.filter((p) => p.kind === CODE_PROJECT_KIND).map((p) => ({ ...p, kind: CODE_PROJECT_KIND }));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) return [];
    throw e;
  }
}

export async function createCodeProject(args: {
  kidId: string | null;
  familyId: string | null;
  title: string;
  template: CodeTemplateId;
}): Promise<{ id: string }> {
  return api<{ id: string }>(`/projects`, {
    method: 'POST',
    body: {
      title: args.title,
      product_line: 'line_b_coding',
      kind: CODE_PROJECT_KIND,
      template: args.template,
      ...(args.kidId ? { kid_id: args.kidId } : {}),
      ...(args.familyId ? { family_id: args.familyId } : {}),
    },
  });
}

export async function getProject(projectId: string): Promise<CodeProject> {
  return api<CodeProject>(`/projects/${projectId}`);
}

/**
 * Read the project's virtual FS. Falls back to the template starter set when
 * the backend `tools` GET endpoint isn't live yet so the Studio still runs.
 */
export async function readVfs(projectId: string, template: CodeTemplateId = 'blank'): Promise<VfsFile[]> {
  try {
    const res = await api<{ files: VfsFile[] }>(`/projects/${projectId}/code/files`);
    if (res.files?.length) return res.files;
    return STARTER_FILES[template];
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return STARTER_FILES[template];
    }
    throw e;
  }
}

/**
 * Run one agent turn. The backend validates tool calls, debits Stars, and
 * returns the updated VFS + a structured diff (PRD §4 / §10). Until the
 * `code-sessions` module ships we fall back to the generic `/llm/text-completion`
 * proxy with a code-agent system prompt and lift the three code fences locally —
 * the same deterministic path CodePane already proved out.
 */
export async function runAgentTurn(args: {
  projectId: string;
  prompt: string;
  files: VfsFile[];
  approvePlan?: boolean;
  mode: 'lite' | 'pro';
}): Promise<AgentTurnResult> {
  try {
    return await api<AgentTurnResult>(`/projects/${args.projectId}/code/turn`, {
      method: 'POST',
      body: { prompt: args.prompt, approve_plan: args.approvePlan ?? false, mode: args.mode },
    });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return runAgentTurnFallback(args);
    }
    throw e;
  }
}

// ── Fallback agent: single-shot text-completion → 3 fences → VFS diff ───────

async function runAgentTurnFallback(args: {
  projectId: string;
  prompt: string;
  files: VfsFile[];
  mode: 'lite' | 'pro';
}): Promise<AgentTurnResult> {
  const liteHint =
    args.mode === 'lite'
      ? 'The child is 8-11: keep code short, and the summary is one plain sentence with no jargon. '
      : 'The child is 12-17: a concise summary plus a short plan is fine. ';
  const sys =
    'You are Code Critter, a friendly coding tutor for kids. ' +
    'Build/extend a single-page web project using ONLY vanilla HTML, CSS, and JavaScript — ' +
    'no frameworks, no external links, no fetch/XMLHttpRequest/WebSocket, no remote assets. ' +
    liteHint +
    'Reply with EXACTLY three markdown code fences in this order: ```html (body content, no <html>/<head>), then ```css, then ```js. ' +
    'After the fences, add ONE sentence describing what you built or changed.';

  const current = filesToFences(args.files);
  const userMsg = `${current}\n\nThe child says: ${args.prompt}`;

  const res = await api<{ reply: string; stars_charged: number }>(`/llm/text-completion`, {
    method: 'POST',
    body: {
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: userMsg },
      ],
      project_id: args.projectId,
      kind: 'code_agent',
    },
  });

  const fences = extractFences(res.reply);
  const summary = extractSummary(res.reply) || 'Updated your project.';
  const nextFiles = applyFences(args.files, fences);
  const changes = diffFiles(args.files, nextFiles);

  return {
    summary,
    stars_charged: res.stars_charged ?? 2,
    tools_fired: changes.map((c) => `edit_file:${c.path}`),
    changes,
    files: nextFiles,
  };
}

// ── Pure helpers (shared with components + unit-testable) ───────────────────

export function extractFences(text: string): { html?: string; css?: string; js?: string } {
  const out: { html?: string; css?: string; js?: string } = {};
  const re = /```(\w+)?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const lang = (m[1] ?? '').toLowerCase();
    const body = m[2] ?? '';
    if (lang === 'html' || lang === 'htm') out.html = body;
    else if (lang === 'css') out.css = body;
    else if (lang === 'js' || lang === 'javascript') out.js = body;
  }
  return out;
}

function extractSummary(text: string): string {
  const afterLastFence = text.split('```').pop() ?? '';
  return afterLastFence.trim().split('\n')[0]?.trim() ?? '';
}

function filesToFences(files: VfsFile[]): string {
  const get = (p: string) => files.find((f) => f.path === p)?.content ?? '';
  return [
    'Here is the current project:',
    '```html',
    get('index.html'),
    '```',
    '```css',
    get('style.css'),
    '```',
    '```js',
    get('script.js'),
    '```',
  ].join('\n');
}

function applyFences(files: VfsFile[], fences: { html?: string; css?: string; js?: string }): VfsFile[] {
  const next = files.filter((f) => f.kind === 'asset' || !TEXT_TRIPLET.includes(f.path));
  const upsert = (path: string, content: string | undefined) => {
    if (content === undefined) {
      const existing = files.find((f) => f.path === path);
      if (existing) next.push(existing);
      return;
    }
    next.push({ path, content, kind: 'text', size: content.length });
  };
  upsert('index.html', fences.html);
  upsert('style.css', fences.css);
  upsert('script.js', fences.js);
  // keep a stable order: html, css, js, then assets
  return [
    ...TEXT_TRIPLET.map((p) => next.find((f) => f.path === p)).filter((f): f is VfsFile => !!f),
    ...next.filter((f) => !TEXT_TRIPLET.includes(f.path)),
  ];
}

const TEXT_TRIPLET = ['index.html', 'style.css', 'script.js'];

export function diffFiles(before: VfsFile[], after: VfsFile[]): FileChange[] {
  const changes: FileChange[] = [];
  for (const a of after) {
    if (a.kind === 'asset') continue;
    const b = before.find((f) => f.path === a.path);
    const beforeContent = b?.content ?? '';
    if (beforeContent === a.content) continue;
    const beforeLines = beforeContent ? beforeContent.split('\n').length : 0;
    const afterLines = a.content ? a.content.split('\n').length : 0;
    changes.push({
      path: a.path,
      before: beforeContent,
      after: a.content,
      lines_added: Math.max(0, afterLines - beforeLines),
      lines_removed: Math.max(0, beforeLines - afterLines),
    });
  }
  return changes;
}

function buildStarterFiles(): Record<CodeTemplateId, VfsFile[]> {
  const file = (path: string, content: string): VfsFile => ({
    path,
    content,
    kind: 'text',
    size: content.length,
  });
  const make = (html: string, css: string, js: string): VfsFile[] => [
    file('index.html', html),
    file('style.css', css),
    file('script.js', js),
  ];
  return {
    blank: make(
      '<h1 class="title">Hello!</h1>\n<p>Tell the AI what you want to build.</p>',
      '.title { font-family: system-ui; color: #ff5a73; }',
      '',
    ),
    pet_website: make(
      '<h1 class="title">My Pet</h1>\n<p class="bio">All about my best friend.</p>\n<button id="cheer">Give a treat 🦴</button>\n<p id="count">Treats: 0</p>',
      '.title { font-family: system-ui; color: #2d7fff; }\n.bio { font-family: system-ui; }\nbutton { font-size: 1.1rem; padding: .6rem 1rem; border-radius: 999px; border: 0; background: #1fc692; color: #fff; cursor: pointer; }',
      "let treats = 0;\ndocument.getElementById('cheer').addEventListener('click', () => {\n  treats++;\n  document.getElementById('count').textContent = 'Treats: ' + treats;\n});",
    ),
    tiny_game: make(
      '<h1 class="title">Catch the Star ⭐</h1>\n<p>Score: <span id="score">0</span></p>\n<button id="target">⭐</button>',
      '.title { font-family: system-ui; color: #c99a00; }\nbutton { font-size: 2rem; position: relative; }',
      "let score = 0;\nconst t = document.getElementById('target');\nt.addEventListener('click', () => {\n  score++;\n  document.getElementById('score').textContent = score;\n  t.style.marginLeft = (Math.random() * 200) + 'px';\n});",
    ),
    doodle_pad: make(
      '<h1 class="title">Doodle Pad ✏️</h1>\n<canvas id="pad" width="320" height="240"></canvas>',
      '.title { font-family: system-ui; color: #ff6ba9; }\ncanvas { border: 3px solid #ff6ba9; border-radius: 16px; touch-action: none; }',
      "const c = document.getElementById('pad');\nconst ctx = c.getContext('2d');\nlet drawing = false;\nctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.strokeStyle = '#2d7fff';\nc.addEventListener('pointerdown', () => { drawing = true; ctx.beginPath(); });\nc.addEventListener('pointerup', () => { drawing = false; });\nc.addEventListener('pointermove', (e) => {\n  if (!drawing) return;\n  const r = c.getBoundingClientRect();\n  ctx.lineTo(e.clientX - r.left, e.clientY - r.top);\n  ctx.stroke();\n});",
    ),
    beat_box: make(
      '<h1 class="title">Beat Box 🎵</h1>\n<div class="pads">\n  <button data-f="261">Do</button>\n  <button data-f="329">Mi</button>\n  <button data-f="392">So</button>\n</div>',
      '.title { font-family: system-ui; color: #c99a00; }\n.pads { display: flex; gap: .5rem; }\nbutton { font-size: 1.2rem; padding: 1rem; border-radius: 16px; border: 0; background: #ff6ba9; color: #fff; cursor: pointer; }',
      "const actx = new (window.AudioContext || window.webkitAudioContext)();\ndocument.querySelectorAll('button').forEach((b) => {\n  b.addEventListener('click', () => {\n    const o = actx.createOscillator();\n    o.frequency.value = Number(b.dataset.f);\n    o.connect(actx.destination);\n    o.start();\n    o.stop(actx.currentTime + 0.25);\n  });\n});",
    ),
  };
}
