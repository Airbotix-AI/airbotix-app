// Parent-friendly copy for the kids-opencode (desktop coding tool) pipeline events.
// Frozen taxonomy from audit-event-schema-prd v0.2 §3.4. Several of these are
// "payload pending" upstream, so detail lines stay defensive.

import type { AuditCopy } from './auditCopy';
import { asStr, formatStars, humanize, line, type Payload } from './auditCopy.helpers';

type Builder = (p: Payload) => AuditCopy;

export const KIDS_BUILDERS: Record<string, Builder> = {
  'plugin.loaded': (p) => ({
    icon: '🧩',
    tone: 'sky',
    title: 'Coding tool started',
    detail: line(
      asStr(p.course_pack) ? `Course: ${humanize(asStr(p.course_pack)!)}` : null,
      asStr(p.mission) ? `Mission: ${humanize(asStr(p.mission)!)}` : null,
    ),
  }),
  'plugin.failed': () => ({
    icon: '⚠️',
    tone: 'coral',
    title: "Coding tool couldn't start",
  }),
  'course_pack.loaded': (p) => ({
    icon: '📚',
    tone: 'sky',
    title: 'Course loaded',
    detail: asStr(p.course_pack) ? humanize(asStr(p.course_pack)!) : undefined,
  }),
  'course_pack.not_found': (p) => ({
    icon: '📚',
    tone: 'sunshine',
    title: "Couldn't find a course",
    detail: asStr(p.requested) ? humanize(asStr(p.requested)!) : undefined,
  }),
  'course_pack.mission_advanced': (p) => ({
    icon: '🏁',
    tone: 'mint',
    title: 'Moved on to the next mission',
    detail: asStr(p.mission) ? humanize(asStr(p.mission)!) : undefined,
  }),
  'scaffold.render_error': () => ({
    icon: '🧱',
    tone: 'sunshine',
    title: 'A lesson template had a hiccup',
    detail: 'The coding tool recovered automatically',
  }),
  'tool.execute.before': (p) => ({
    icon: '🤖',
    tone: 'sky',
    title: 'AI helper is using a tool',
    detail: asStr(p.tool) ? humanize(asStr(p.tool)!) : undefined,
  }),
  'tool.execute.after': (p) => ({
    icon: '🛠️',
    tone: 'bubblegum',
    title: 'AI helper finished a step',
    detail: line(asStr(p.title), formatStars(p.stars_charged)),
  }),
  'tool.blocked.not_whitelisted': (p) => ({
    icon: '🛡️',
    tone: 'sunshine',
    title: 'A tool was blocked',
    detail: asStr(p.tool)
      ? `${humanize(asStr(p.tool)!)} isn't on the allowed list`
      : "It isn't on the allowed list",
  }),
  'tool.blocked.webfetch_host': (p) => ({
    icon: '🛡️',
    tone: 'sunshine',
    title: 'A website was blocked',
    detail: asStr(p.url) ?? 'The site is outside the allowed list',
  }),
  'tool.blocked.path_guard': () => ({
    icon: '🛡️',
    tone: 'sunshine',
    title: 'A file location was protected',
    detail: 'The AI helper tried to reach outside the project folder',
  }),
  'session.started': () => ({
    icon: '▶️',
    tone: 'mint',
    title: 'Coding session started',
  }),
  'session.ended': () => ({
    icon: '🏁',
    tone: 'sky',
    title: 'Coding session ended',
  }),
  'session.aborted': () => ({
    icon: '⏹️',
    tone: 'sunshine',
    title: 'Coding session stopped early',
  }),
  'llm.request': () => ({
    icon: '💬',
    tone: 'sky',
    title: 'Asked the AI helper',
  }),
  'llm.response': (p) => ({
    icon: '🤖',
    tone: 'bubblegum',
    title: 'AI helper replied',
    detail: formatStars(p.stars_charged) ?? undefined,
  }),
  'prompt_injection.detected': () => ({
    icon: '🚫',
    tone: 'coral',
    title: 'Prompt injection blocked',
    detail: 'An attempt to override AI rules was blocked in the coding tool.',
  }),
  'dangerous_topic.intercepted': () => ({
    icon: '🛡️',
    tone: 'coral',
    title: 'Unsafe topic stopped',
    detail: 'The coding tool stepped in before the AI replied.',
  }),
  'parent.audit_viewed': () => ({
    icon: '👀',
    tone: 'sky',
    title: 'You viewed this activity feed',
  }),
  'teacher.kill_switch.triggered': () => ({
    icon: '🛑',
    tone: 'coral',
    title: 'Teacher paused the class tools',
    detail: 'A teacher stopped AI activity for the workshop.',
  }),
};
