# CLAUDE.md — Airbotix-AI/airbotix-app

> Project context for AI coding tools. This repo is a **submodule of the `airbotix-ai` umbrella**
> (`~/Documents/sites/airbotix-ai/airbotix-app/`). Read the umbrella-root `CLAUDE.md` + `AGENTS.md`
> for platform-wide rules, `rules/` for mandatory coding standards, and `DESIGN.md` + `design-system/`
> for the K-12 design system. Shared docs/PRDs live at the umbrella root `docs/`, **not** in this repo.
> Every change updates this repo's `CHANGELOG.md` in the same commit (Keep a Changelog format).

## What this repo is

The **unified SPA** for `app.airbotix.ai` — serves both parent surface (`/portal/*`) and kid surface (`/learn/*`) in one bundle with route-level RBAC.

| Surface | Routes | Principal | Layout |
|---|---|---|---|
| Parent Portal | `/portal/*` | `User`, role=parent | nav drawer + content (ops style) |
| Learn | `/learn/*` | `KidProfile` | top bar + content |

## Stack (locked 2026-05-15)

Vite 5 + React 18 + TypeScript strict / Tailwind / TanStack Query + Zustand / react-hook-form + zod / React Router v6 / socket.io-client / date-fns.

Hosted on AWS S3 + CloudFront ap-southeast-2.

## Where to find product context

All paths below are at the **umbrella root** (`~/Documents/sites/airbotix-ai/docs/…`, i.e. `../docs/…` from here).

| Doc | Location |
|---|---|
| Parent Portal PRD | `docs/product/prd/parent-portal-prd.md` |
| Learn PRD | `docs/product/prd/airbotix-app-learn-prd.md` |
| Auth spec | `docs/product/prd/auth-system-prd.md` |
| API contract | `docs/product/prd/platform-backend-api-spec.md` |
| Master product PRD | `docs/product/prd/kids-ai-platform-prd.md` |
| Compliance | `docs/product/compliance/minors-compliance.md` |

## Critical contracts

### 1. One auth store, two principal kinds
The same Zustand store holds the access token regardless of who's signed in. `AuthPrincipal` is a discriminated union: `{ kind: 'user' } | { kind: 'kid' }`. Components / hooks branch on `kind`, never on `role` directly. `<ProtectedRoute kind="user">` and `<ProtectedRoute kind="kid">` enforce the boundary.

### 2. Access token is in memory only
Stored in Zustand (`useAuthStore`). Never `localStorage` / `sessionStorage`. XSS-resilient. Refresh happens via HttpOnly cookie set by `platform-backend` at `/auth/refresh`.

### 3. Cross-surface bounce
- Kid signed in tries to visit `/portal/*` → bounced to `/learn`
- Parent signed in tries to visit `/learn/*` → bounced to `/portal`
- Same browser, one session at a time (cookies are domain-scoped to `.airbotix.ai`)

### 4. Server is the source of truth for authz
Client gates exist for UX only. The backend enforces every check. If a query/mutation returns data, the backend already approved it. Do not "trust me" gate anything client-side that the API hasn't already filtered.

### 5. No direct LLM calls
Kid surface NEVER calls Anthropic / OpenAI / DeepRouter directly. All AI traffic goes through `platform-backend /llm/*`. The backend injects kid-safe context, meters Stars, and emits audit events.

### 6. Privacy per principal
- Parent sees: their own family + kids + wallet + audit. Backend redacts other families.
- Kid sees: only their own projects + own audit + own class wall. Backend redacts everything else.
- Neither sees: teacher data, admin actions, other families.

## Conventions

- Path alias `@/*` (configured in `tsconfig.json` + `vite.config.ts`)
- Page components live in `src/pages/{portal,learn}/`
- Reusable UI in `src/components/`
- Hooks co-located with feature or in `src/hooks/`
- API client = `src/lib/api.ts`. Don't `fetch()` directly from components.
- Never log PII (email, kid nickname, prompts, project content)
- Forms use `react-hook-form` + zod — no plain `useState` for multi-field forms
- Conditional Tailwind via `clsx`

## Adding a new page

1. Find the PRD section in `parent-portal-prd.md §4.X` or `airbotix-app-learn-prd.md §X`
2. Pick a path under `/portal/*` or `/learn/*`
3. Add the route in `src/app/router.tsx` under the right `<ProtectedRoute kind="...">` outlet
4. If portal, add NavDrawer entry; if learn, add to LearnTopBar if it's a top-level
5. Implement the page (drop the `<PagePlaceholder>` placeholder)
6. Wire data with TanStack Query against `platform-backend`

## Sibling repos (all submodules of the `airbotix-ai` umbrella)

```
~/Documents/sites/airbotix-ai/                  umbrella hub — rules/, docs/ (PRDs), DESIGN.md, design-system/
~/Documents/sites/airbotix-ai/airbotix-app/     THIS REPO — unified Portal+Learn SPA
~/Documents/sites/airbotix-ai/teacher-console/  teacher console (teacher.airbotix.ai)
~/Documents/sites/airbotix-ai/super-admin/      internal admin / super_admin (admin.airbotix.ai)
~/Documents/sites/airbotix-ai/platform-backend/ shared NestJS + Prisma backend (api.airbotix.ai)
~/Documents/sites/airbotix-ai/airbotix/         marketing site (airbotix.ai)
```
