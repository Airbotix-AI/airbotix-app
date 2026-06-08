# Chat UX — gaps & redesign

> **Status:** DRAFT · 2026-06-08 · for review (no code yet)
> **Scope:** Bring the Game Studio AI chat (`panes/AIChatPanel.tsx` + `panes/useGameAgent.ts`)
> up to a world-class, **kid-facing** standard. Two headline gaps drove this doc — **scroll
> behaviour** and the **"thinking" wait** — plus a prioritised backlog of the smaller misses
> found in the same audit.
> **Owner:** Airbotix engineering
> **Non-goals:** the backend turn loop, the Stars economy, the safeguarding pipeline, markdown
> rendering policy (flagged as an open decision, not designed here).

---

## 1. Context

The chat is the **primary surface** of the Game Studio (kids vibe-code games by talking to it).
It is split presentational/stateful by design:

- `panes/AIChatPanel.tsx` — purely presentational. Renders the message list, input, staged-turn
  card, safety banners. Never calls the hook.
- `panes/useGameAgent.ts` — the controller hook. Owns `chat: ChatItem[]`, `busy`, `pending`,
  `safeguard`, and the send → pending → resolve → apply+run flow.
- `panes/gameAgentStub.ts` — the local stub turn (real backend swaps in later via the `runTurn` seam).

The reply path is **not network-streamed**: the backend is a single `POST /projects/:id/code/turn`
(`code/codeApi.ts`). The token-by-token reveal the kid sees is a **client-side replay**
(`streamTurn`, ~18 ms/token) that runs *after* the response is already back. This matters for both
headline gaps below.

The UX shell, safety banners (AI disclosure, crisis resource, raise-hand), Stars badge, staged-turn
"agency beat / plan gate", and Undo are all already strong. The gaps are in **message flow** and
**perceived responsiveness**, not in the safety or product framing.

---

## 2. The two headline gaps

### 2.1 Gap A — Scroll behaviour (correctness)

**Today.** The list is a bare scroll container with **zero scroll logic**:

```
AIChatPanel.tsx:178   <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
```

No `ref`, no scroll-to-bottom, no live region. When a new bubble is appended, or when `streamTurn`
grows the last bubble token-by-token (`useGameAgent.ts:217`), **the viewport does not move**. The kid
sends a message and the conversation appears frozen; the reply streams in below the fold, unseen.

**Target behaviour** (the iMessage / Slack / ChatGPT state machine — *not* "scroll to bottom on every
update"):

1. **Stick-to-bottom while pinned.** Track whether the user is within ~40 px of the bottom. While
   pinned, every append/token keeps the view glued to the bottom.
2. **Release on manual scroll-up.** The instant the kid scrolls up to re-read, stop auto-following.
   Never yank them back down mid-read. (This is the bug people hate most when it is done naively.)
3. **"New messages" pill.** While released *and* new content is arriving, float a **↓ pill** near the
   bottom of the list. One tap → smooth-scroll to bottom and re-pin. This is the explicit ask: *don't*
   auto-scroll when the kid isn't at the bottom, but *do* signal there's something new and make
   catching up one click.
4. **Bottom-anchored streaming.** Tokens append to the *last* bubble, so the bubble's **bottom** must
   stay pinned (CSS `overflow-anchor`, plus glue-to-bottom each frame while pinned) — otherwise the
   text treadmills.

**Why it needs care here.** The reply is a replay, so scroll updates fire ~50×/sec during a turn. The
pinned-check must be cheap (read `scrollTop`/`clientHeight`/`scrollHeight`, no forced reflow) and the
pill's visibility must be debounced so it doesn't flicker as the last token lands.

**Design.** A self-contained hook, no new dependency:

```ts
// panes/useStickToBottom.ts
function useStickToBottom(dep: unknown): {
  listRef: RefObject<HTMLDivElement>;   // attach to the scroll container
  atBottom: boolean;                    // is the kid pinned to the bottom?
  showJump: boolean;                    // render the "new messages" pill?
  jumpToBottom: () => void;             // smooth-scroll + re-pin
}
```

- On the container's `scroll` event, recompute `atBottom = scrollHeight - scrollTop - clientHeight < THRESHOLD`.
- When `dep` (the chat array / streaming text) changes: if `atBottom`, glue to bottom; else set
  `showJump = true`.
- `jumpToBottom()` smooth-scrolls and clears `showJump`.

`AIChatPanel` consumes it: `ref` on line 178's div, and an absolutely-positioned pill inside the list
wrapper. Pill copy is kid-first: **"↓ New stuff!"** (not "1 new message").

> **Alternative considered:** `use-stick-to-bottom` (the library the ChatGPT-clone community
> standardised on). **Rejected** — ~40 lines hand-rolled is less than the integration surface, fits
> the "minimum code" rule, and lets us special-case the replay cadence. Revisit if virtualization
> lands.

---

### 2.2 Gap B — The "thinking" wait (kid experience)

**Today.** The wait is one faded-italic string:

```
useGameAgent.ts:106   const PENDING_TEXT = 'Thinking…';
AIChatPanel.tsx:368   item.pending || item.streaming ? 'italic opacity-70' : ''
```

To an 8–11-year-old this reads as *frozen/broken*. Worse: during the **actual** network round-trip
(the single POST) the kid sees *only* this static word — the fun token reveal doesn't start until the
response is already back. So the dullest moment is also the longest one.

**What world-class products do in the wait** (patterns worth stealing):

| App | In the wait | Steal |
|---|---|---|
| ChatGPT | Shimmer + contextual pill ("Searching", "Thinking") | Name the *activity*, never say "loading" |
| Perplexity | Staged checklist ticking ("Searching → Reading → Writing") | Progress feels earned, not idle |
| Gemini | Animated sparkle + shimmer text | Brand motion *is* the spinner |
| Duolingo / Khanmigo | Mascot reacts while it thinks | A *character*, not a spinner, for kids |
| Cursor / Replit | Live tool lines ("Reading game.js… Editing…") | Show the agent's real steps |

**We already built the right asset and aren't reusing it.** `GeneratingScreen` has a spinning
brand-gradient orb (`.pg-orb-spin`), a **staged status list**, and shimmer (`.pg-shimmer`) — all
already `prefers-reduced-motion`-aware in `playground.css`. The chat wait should speak the **same
motion language** so "building your game" and "the AI is working" feel like one product.

**Design — `ThinkingBubble`** (replaces the italic pending bubble):

- A compact agent bubble: a **small spinning orb** (reuse `.pg-orb-spin`) or three bouncing brand
  dots, beside **rotating kid-friendly status copy** that cycles while the POST is in flight:
  *"Reading your game 👀" → "Thinking of ideas 💡" → "Writing the code ✍️" → "Almost there! 🚀"*
  (~1.2 s cadence). Because it's a single POST we can't show *real* progress — the cycle is
  honest-feeling motion, not a fake progress bar.
- When the response lands and `streamTurn` starts, **swap the orb for the token reveal**, and upgrade
  the cursor: the current `▍ animate-pulse` (`AIChatPanel.tsx:373`) is a dev-tool caret; use a softer
  blinking block or a tiny trailing sparkle.
- **Surface real tool steps during replay (near-free).** `streamTurn` already yields per-tool deltas
  (`toolsFired`), so render "✏️ Editing game.js" *live* during the reveal instead of only as final
  chips — the Cursor/Replit move, and the data already flows.
- **`prefers-reduced-motion`:** cross-fade the status copy instead of bouncing; no orb spin. The CSS
  already sets this precedent.

This is the single highest-leverage delight change in the panel, and it reuses motion already shipped.

> **Copy source of truth.** The cycling status lines are **client-side flavour only** (the turn is one
> POST — there are no real server stages to report). Keep them generic/kind; do **not** imply the AI is
> doing steps it isn't. The *real* `toolsFired` chips are the only ground-truth progress and are shown
> as themselves.

---

## 3. The rest of the audit (prioritised backlog)

These are real but smaller; most are nearly free because the plumbing already exists.

**High**

| # | Gap | Why it's cheap |
|---|---|---|
| H1 | **No Stop button.** `streamTurn` is handed an `AbortSignal` (`sig`, `useGameAgent.ts`) that no UI fires. | Make the send button a **Stop** button while `busy`; wire to the existing abort. |
| H2 | **No retry on error.** Errors render as a dead banner (`AIChatPanel.tsx:193`); the kid must retype. | Add inline **"Try again ↻"** on the failed turn; resend the last prompt (already in `pending`/last kid item). |
| H3 | **Not announced / not accessible.** The list isn't `role="log"` + `aria-live="polite"`; read-aloud kids get nothing on a new agent message. The `▍` caret is read aloud as a character. | Add the roles; `aria-hidden` the caret. |

**Medium**

| # | Gap | Note |
|---|---|---|
| M1 | **Agent text is plain `whitespace-pre-wrap`** (`:371`). For a *coding* helper, snippets render as undifferentiated text. | **Open decision** (§5) — may be a deliberate "no jargon" choice. Designed only if we say yes. |
| M2 | **Textarea fixed `rows={2}`** (`:215`), no auto-grow. Long prompts scroll inside two lines. | Auto-expand to a cap (~5 rows) then scroll. |
| M3 | **Empty state is one static line** (`:181`). | Offer 2–3 tappable suggestion chips (mirror `LandingScreen`'s starter chips) to kill the blank-page problem. |
| M4 | **No autofocus** on the input when the chat window opens/focuses. | Focus on mount + on window focus. |

**Low / polish**

- L1 — Send button has hover-lift but no pressed/active state; kids are on tablets (touch, no hover).
- L2 — No "message sent" micro-feedback (a tiny scale-in on the kid bubble sells responsiveness).
- L3 — No scroll-position memory across Window ⇄ Split layout toggles.

---

## 4. Component / data changes (summary)

No change to the `ChatItem` / `PendingTurn` / `AgentTurnResult` contracts is required for Gaps A & B.

| Area | Change |
|---|---|
| **New** `panes/useStickToBottom.ts` | The pinned/`showJump`/`jumpToBottom` hook (Gap A). |
| **New** `panes/ThinkingBubble.tsx` | Animated orb + cycling status copy (Gap B). Replaces the inline italic pending render in `ChatRow`. |
| `panes/AIChatPanel.tsx` | Attach `listRef`; render the jump pill; render `ThinkingBubble` for `item.pending`; live `toolsFired` during streaming; Stop button (H1); inline retry (H2); `role="log"`/`aria-live` (H3); `aria-hidden` caret. |
| `panes/useGameAgent.ts` | Expose an `abort()` (wraps the existing `sig`) and a `retryLast()` for H1/H2. No flow change otherwise. |
| `playground.css` | Reuse `.pg-orb-spin`/`.pg-shimmer`; add a small dots-bounce keyframe if chosen, guarded by `prefers-reduced-motion`. |

---

## 5. Open decisions (need a call before coding)

| # | Decision | Options | Lean |
|---|---|---|---|
| D1 | **Markdown / code formatting in agent text** (M1) | (a) keep plain text — simplest, most kid-safe; (b) light inline code spans + copy-able code chip. | Defer — ship A & B first; decide M1 with product. |
| D2 | **Thinking visual** | (a) reuse `.pg-orb-spin` orb; (b) three bouncing brand dots; (c) a mascot. | (a) — consistency with `GeneratingScreen`, zero new art. |
| D3 | **Jump-pill copy** | "↓ New stuff!" vs "↓ Jump to newest". | "↓ New stuff!" (kid voice). |

---

## 6. Implementation outline (after this doc is approved)

1. `useStickToBottom` hook + wire into `AIChatPanel` (Gap A) + pill. **e2e:** scroll up, append a
   message → pill shows; tap → re-pins; while pinned, append → stays glued.
2. `ThinkingBubble` + cycling copy + live `toolsFired` during replay (Gap B). **e2e:** pending shows
   the animated bubble (not the bare word); reduced-motion path cross-fades.
3. H1 Stop, H2 retry, H3 a11y. **e2e:** Stop aborts a turn; Try-again resends; list has `role="log"`.
4. Medium items (M2–M4) as a fast-follow.

All work honors `prefers-reduced-motion` and the `pg-*`/brand token rule (no raw hex). Every new
behaviour gets Playwright coverage (per team rule: e2e for every new feature) and must keep the
existing playground specs green.

---

## 7. Revision history

| Date | Change |
|---|---|
| 2026-06-08 | Initial draft — audit of the two headline gaps (scroll, thinking) + prioritised backlog. |
