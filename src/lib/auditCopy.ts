// Human-readable copy for audit/activity events.
//
// The backend emits machine event types like `wallet.topup_initiated` with a
// raw JSON payload. Parents should never see those. This module maps each
// (event_type, payload) pair to a friendly icon + headline + optional detail
// line. Anything unmapped falls back to a title-cased version of the event
// type, so the timeline never shows raw `dotted.snake_case` strings.
//
// Keep the mapping table here (not in the component) so the page stays small
// and this is unit-testable.

export type AuditTone = 'coral' | 'bubblegum' | 'sunshine' | 'sky' | 'mint' | 'slate';

export interface AuditCopy {
  /** Single emoji shown in the leading bubble. */
  icon: string;
  /** Plain-language headline a parent can understand at a glance. */
  title: string;
  /** Optional supporting line (amounts, names, status). */
  detail?: string;
  /** Color accent for the leading bubble. */
  tone: AuditTone;
}

type Payload = Record<string, unknown>;

// ---- payload field helpers (defensive: payloads are untyped JSON) ----

const asNum = (v: unknown): number | null => (typeof v === 'number' ? v : null);
const asStr = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;
const asBool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);

/** `1000` → `"$10.00 AUD"` */
export function formatAud(cents: unknown): string | null {
  const c = asNum(cents);
  if (c == null) return null;
  return `$${(c / 100).toFixed(2)} AUD`;
}

/** `10` → `"10 Stars"`, `1` → `"1 Star"` */
export function formatStars(n: unknown): string | null {
  const s = asNum(n);
  if (s == null) return null;
  return `${s} ${s === 1 ? 'Star' : 'Stars'}`;
}

/** `"first_visit"` → `"First visit"` */
function humanize(raw: string): string {
  const words = raw.replace(/[._-]+/g, ' ').trim().split(/\s+/);
  if (words.length === 0) return raw;
  const joined = words.join(' ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/** Join non-empty fragments with a middot. */
function line(...parts: Array<string | null | undefined>): string | undefined {
  const kept = parts.filter((p): p is string => !!p);
  return kept.length > 0 ? kept.join(' · ') : undefined;
}

/** `"VISA"` + `"4242"` → `"Visa ···· 4242"` */
function cardLabel(p: Payload): string | undefined {
  const brand = asStr(p.brand);
  const last4 = asStr(p.last4);
  const pretty = brand
    ? brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase()
    : null;
  if (pretty && last4) return `${pretty} ···· ${last4}`;
  return pretty ?? (last4 ? `···· ${last4}` : undefined);
}

// ---- friendly actor labels (parent's point of view) ----

const ACTOR_LABEL: Record<string, string> = {
  kid: 'Your child',
  agent: 'AI helper',
  parent: 'You',
  teacher: 'Teacher',
  admin: 'Airbotix',
  super_admin: 'Airbotix',
  system: 'System',
  service: 'System',
};

export function friendlyActor(actor: string): string {
  return ACTOR_LABEL[actor] ?? humanize(actor);
}

// ---- per-event builders ----

type Builder = (p: Payload) => AuditCopy;

const BUILDERS: Record<string, Builder> = {
  // —— Wallet ——
  'wallet.topup_initiated': (p) => ({
    icon: '💳',
    tone: 'coral',
    title: 'Top-up started',
    detail: line(formatStars(p.stars), formatAud(p.amount_aud_cents)),
  }),
  'wallet.topup_succeeded': (p) => ({
    icon: '✅',
    tone: 'mint',
    title: 'Stars added to your wallet',
    detail: formatStars(p.stars) ?? undefined,
  }),
  'wallet.topup_failed': (p) => ({
    icon: '⚠️',
    tone: 'coral',
    title: "Top-up didn't go through",
    detail: asStr(p.status) ? humanize(asStr(p.status)!) : 'No Stars were charged',
  }),
  'wallet.refunded': (p) => ({
    icon: '↩️',
    tone: 'sky',
    title: 'Refunded to your wallet',
    detail: formatStars(p.stars) ?? undefined,
  }),
  'wallet.caps_updated': () => ({
    icon: '🎛️',
    tone: 'sky',
    title: 'Spending limits updated',
  }),
  'wallet.paused': () => ({
    icon: '⏸️',
    tone: 'sunshine',
    title: 'Wallet paused',
    detail: 'AI spending is on hold',
  }),
  'wallet.resumed': () => ({
    icon: '▶️',
    tone: 'mint',
    title: 'Wallet resumed',
    detail: 'AI spending is back on',
  }),
  'wallet.admin_adjust': (p) => ({
    icon: '🛠️',
    tone: 'sky',
    title: 'Wallet adjusted by Airbotix',
    detail: line(formatStars(p.delta_stars), asStr(p.reason)),
  }),
  'wallet.payment_method_setup_intent': () => ({
    icon: '💳',
    tone: 'sky',
    title: 'Adding a payment method',
  }),
  'wallet.payment_method_added': (p) => ({
    icon: '💳',
    tone: 'mint',
    title: 'Payment method added',
    detail: cardLabel(p),
  }),
  'wallet.payment_method_default_set': (p) => ({
    icon: '💳',
    tone: 'sky',
    title: 'Default card updated',
    detail: cardLabel(p),
  }),
  'wallet.payment_method_removed': (p) => ({
    icon: '💳',
    tone: 'sunshine',
    title: 'Payment method removed',
    detail: cardLabel(p),
  }),
  'wallet.auto_topup_updated': (p) => ({
    icon: '🔁',
    tone: 'sky',
    title: 'Auto top-up updated',
    detail:
      asBool(p.enabled) == null ? undefined : asBool(p.enabled) ? 'Turned on' : 'Turned off',
  }),
  'wallet.auto_topup_attempt': (p) => ({
    icon: '🔁',
    tone: 'coral',
    title: 'Auto top-up',
    detail: line(
      formatAud(p.amount_aud_cents),
      asStr(p.status) ? humanize(asStr(p.status)!) : null,
    ),
  }),

  // —— Approvals ——
  'approval.requested': (p) => ({
    icon: '🙋',
    tone: 'sunshine',
    title: 'Your child asked for permission',
    detail: asStr(p.type) ? humanize(asStr(p.type)!) : undefined,
  }),
  'approval.granted': (p) => ({
    icon: '✅',
    tone: 'mint',
    title: 'You approved a request',
    detail: asStr(p.type) ? humanize(asStr(p.type)!) : undefined,
  }),
  'approval.denied': (p) => ({
    icon: '🚫',
    tone: 'coral',
    title: 'You declined a request',
    detail: asStr(p.type) ? humanize(asStr(p.type)!) : undefined,
  }),

  // —— Projects ——
  'project.created': (p) => ({
    icon: '🎨',
    tone: 'bubblegum',
    title: 'New project created',
    detail: asStr(p.title) ?? undefined,
  }),
  'project.updated': () => ({ icon: '✏️', tone: 'sky', title: 'Project updated' }),
  'project.deleted': () => ({ icon: '🗑️', tone: 'sunshine', title: 'Project deleted' }),
  'project.artifact_uploaded': (p) => ({
    icon: '📎',
    tone: 'sky',
    title: 'File added to a project',
    detail: asStr(p.kind) ? humanize(asStr(p.kind)!) : undefined,
  }),
  'project.share_requested': () => ({
    icon: '🔗',
    tone: 'sunshine',
    title: 'Asked to share a project',
  }),
  'project.share_teacher_reviewed': (p) => ({
    icon: '👩‍🏫',
    tone: 'sky',
    title: 'Teacher reviewed a share request',
    detail: asStr(p.decision) ? humanize(asStr(p.decision)!) : undefined,
  }),
  'project.share_parent_reviewed': (p) => ({
    icon: '👪',
    tone: 'mint',
    title: 'You reviewed a share request',
    detail: asStr(p.decision) ? humanize(asStr(p.decision)!) : undefined,
  }),

  // —— Auth (child sign-in) ——
  'auth.kid_login_success': () => ({ icon: '🔑', tone: 'mint', title: 'Your child signed in' }),
  'auth.kid_login_failed': () => ({
    icon: '🔒',
    tone: 'sunshine',
    title: 'Failed sign-in attempt',
  }),
  'auth.kid_login_locked': () => ({
    icon: '🔒',
    tone: 'coral',
    title: "Your child's sign-in was locked",
    detail: 'Too many attempts — try again later',
  }),

  // —— Class ——
  'class.enrolled': () => ({ icon: '🏫', tone: 'sky', title: 'Joined a class' }),
  'class.dropped': () => ({ icon: '🏫', tone: 'sunshine', title: 'Left a class' }),

  // —— Code ——
  'code.vfs.write': (p) => ({
    icon: '💾',
    tone: 'sky',
    title: 'Saved code changes',
    detail: asNum(p.files_changed) != null ? `${asNum(p.files_changed)} files` : undefined,
  }),

  // —— Family ——
  'family.note_added': () => ({ icon: '📝', tone: 'sky', title: 'A note was added' }),
  'family.data_exported': () => ({ icon: '📤', tone: 'sky', title: 'You exported your data' }),

  // —— Incidents ——
  'incident.opened': (p) => ({
    icon: '🚨',
    tone: 'coral',
    title: 'An issue was flagged',
    detail: asStr(p.title) ?? undefined,
  }),
  'incident.resolved': () => ({ icon: '✅', tone: 'mint', title: 'An issue was resolved' }),
};

// LLM events share one shape: `llm.<media>.<completed|failed>`.
const LLM_MEDIA: Record<string, { icon: string; noun: string }> = {
  text: { icon: '🤖', noun: 'text' },
  image: { icon: '🖼️', noun: 'an image' },
  music_score: { icon: '🎵', noun: 'music' },
  tts: { icon: '🔊', noun: 'a voice clip' },
  video: { icon: '🎬', noun: 'a video' },
};

function describeLlm(eventType: string, p: Payload): AuditCopy | null {
  const parts = eventType.split('.'); // ['llm', '<media>', '<outcome>']
  if (parts[0] !== 'llm' || parts.length < 3) return null;
  const media = LLM_MEDIA[parts[1]] ?? { icon: '🤖', noun: parts[1].replace(/_/g, ' ') };
  const outcome = parts[parts.length - 1];
  if (outcome === 'failed') {
    return {
      icon: '⚠️',
      tone: 'coral',
      title: `AI couldn't make ${media.noun}`,
      detail: 'No Stars were charged',
    };
  }
  return {
    icon: media.icon,
    tone: 'bubblegum',
    title: `AI helped make ${media.noun}`,
    detail: formatStars(p.stars_charged) ?? undefined,
  };
}

// Safety events — differentiated cards so parents understand what was filtered.
// Event types are the actual backend events from firewall.service.ts / pii.service.ts.
// safety.prompt.rejected carries a `stage` payload field that discriminates the
// firewall stage (regex_blacklist / topic_classifier / prompt_injection).
function describeSafety(eventType: string, p: Payload): AuditCopy | null {
  if (!eventType.startsWith('safety.')) return null;

  // Single unified rejection event — stage field tells us which firewall stage fired.
  if (eventType === 'safety.prompt.rejected') {
    const stage = asStr(p.stage);
    if (stage === 'regex_blacklist')
      return { icon: '🛡️', tone: 'slate', title: 'Filtered phrase detected', detail: 'A blocked word or phrase was caught before sending.' };
    if (stage === 'topic_classifier') {
      const topic = asStr(p.topic);
      return { icon: '🛡️', tone: 'sunshine', title: 'Topic not allowed', detail: topic ? `Topic: ${humanize(topic)}` : 'This topic is outside the allowed list.' };
    }
    if (stage === 'prompt_injection')
      return { icon: '🚫', tone: 'coral', title: 'Prompt injection blocked', detail: 'An attempt to override AI rules was blocked.' };
    return { icon: '🛡️', tone: 'sunshine', title: 'Safety filter stepped in', detail: 'Content was checked and adjusted.' };
  }

  // PII events
  if (eventType === 'safety.pii.blocked' || eventType === 'safety.pii.artifact_blocked') {
    const cats = Array.isArray(p.categories) ? (p.categories as string[]).join(', ') : null;
    return { icon: '🔒', tone: 'sunshine', title: 'Personal info protected', detail: cats ? `Detected: ${cats}` : 'Private information was caught and protected.' };
  }
  if (eventType === 'safety.pii.warned')
    return { icon: '🔒', tone: 'sunshine', title: 'Personal info notice sent', detail: 'A caution about sharing personal details was shown.' };
  if (eventType === 'safety.pii.warn_acknowledged')
    return { icon: '✅', tone: 'mint', title: 'Chose to continue after caution', detail: 'Your child acknowledged the personal info notice and continued.' };

  if (eventType === 'safety.pattern.escalated')
    return { icon: '📣', tone: 'coral', title: 'Repeated safety triggers', detail: 'Multiple safety events in a short period — teacher was notified.' };

  if (eventType === 'safety.prompt.aborted')
    return { icon: '✅', tone: 'mint', title: 'Made a safer choice', detail: 'Your child stopped before sending a flagged message.' };

  // Output moderation
  if (eventType === 'safety.response.rejected')
    return { icon: '🛡️', tone: 'sunshine', title: 'AI response filtered', detail: "The AI's response was blocked before your child saw it." };
  if (eventType === 'safety.response.redacted')
    return { icon: '🛡️', tone: 'sky', title: 'AI response adjusted', detail: "Part of the AI's response was removed before your child saw it." };

  // Pass / admin events don't need parent cards.
  if (/\.passed$|\.published$|\.rollback$/.test(eventType))
    return { icon: '🛡️', tone: 'mint', title: 'Safety check passed' };

  const blocked = /reject|block|redact|warn/.test(eventType);
  return blocked
    ? { icon: '🛡️', tone: 'sunshine', title: 'Safety filter stepped in', detail: 'Content was checked and adjusted.' }
    : { icon: '🛡️', tone: 'mint', title: 'Safety check passed' };
}

/**
 * Translate a raw audit event into parent-friendly copy.
 * Unmapped events fall back to a title-cased headline so nothing leaks raw
 * machine strings into the UI.
 */
export function describeAuditEvent(event: {
  event_type: string;
  payload: Payload | null | undefined;
}): AuditCopy {
  const payload = event.payload ?? {};
  const exact = BUILDERS[event.event_type];
  if (exact) return exact(payload);

  const llm = describeLlm(event.event_type, payload);
  if (llm) return llm;

  const safety = describeSafety(event.event_type, payload);
  if (safety) return safety;

  // Fallback: humanize the event type, drop the domain prefix for readability.
  const withoutDomain = event.event_type.includes('.')
    ? event.event_type.slice(event.event_type.indexOf('.') + 1)
    : event.event_type;
  return { icon: '•', tone: 'slate', title: humanize(withoutDomain) };
}
