# CLAUDE.md — kidsinai/creative-web

## What this repo is

Frontend web app for the **low-age (6-11) creative AI platform** — one of two product lines under Kids in AI. Lets kids create AI images / music / stories in a parent-monitored, kid-safe environment.

## Where to find project context

| Doc | Location |
|---|---|
| Master plan (all decisions) | `kidsinai/planning/PROJECT.md` (private repo) |
| Product PRD (full) | `~/Documents/sites/airbotix/docs/product/prd/kids-ai-platform-prd.md` |
| Compliance | `~/Documents/sites/airbotix/docs/product/compliance/minors-compliance.md` |
| LLM gateway (we depend on) | `~/Documents/sites/deeprouter-ai/deeprouter/` + `jr-academy-ai/deeprouter-brand/DeepRouter-PRD.md` |

## Local dev

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Dev server: http://localhost:5173. Expects `platform-backend` running at http://localhost:8787 (configurable via `VITE_API_BASE_URL`).

## Key conventions

- **No direct LLM provider calls from frontend.** All AI requests go through `platform-backend` → DeepRouter. Safety + Stars + audit happen there.
- TypeScript strict mode; no `any` without a comment justifying it.
- Tailwind utility-first; Lovable-inspired cream/charcoal palette. No CSS files except `index.css` (global) + Tailwind.
- Component files: `src/components/{ComponentName}.tsx`; one component per file.
- Path alias `@/*` resolves to `src/*`.

## Sibling repos

- `kidsinai/opencode` — agentic coding tool for 12+ (separate frontend)
- `kidsinai/platform-backend` — shared backend (Family Account, Stars, Course Pack)
- `kidsinai/planning` — master plan (private)

## Roadmap (V0)

1. **Course Pack runner** — render `kidsinai/planning` course pack JSON as guided missions
2. **AI image creation flow** — kid picks template → enters prompt → backend forwards to DeepRouter → display result + save to portfolio
3. **Class wall** — view classmates' work (audit + remix)
4. **Parent visibility** — every action audit-logged via backend

Out of scope V0: AI music / video / coding. (Coding → `kidsinai/opencode`.)
