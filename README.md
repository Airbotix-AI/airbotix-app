# airbotix-app

> Unified Airbotix SPA for **parents** (`/portal/*`) and **kids** (`/learn/*`) on `app.airbotix.ai`. AWS S3 + CloudFront (Sydney).

🔒 **PRIVATE**. Auth + family + kid PII handling. Do not open-source.

## What this is

A single Vite + React app with two route trees and two layouts:

| Surface | Routes | For | Auth |
|---|---|---|---|
| Parent Portal | `/portal/*` | adults (`role=parent`) | Email OTP → JWT |
| Learn | `/learn/*` | kids (`role=kid`) | Family code + nickname + PIN, OR one-shot class code |

Both surfaces share **one** auth store, **one** API client, **one** router. A discriminated-union `AuthPrincipal` (`{ kind: 'user' | 'kid' }`) decides which surface a session belongs to. Cross-surface navigation auto-bounces — a kid hitting `/portal` is redirected to `/learn`, and vice versa.

Source of truth: `~/Documents/sites/airbotix/docs/product/prd/parent-portal-prd.md` + `airbotix-app-learn-prd.md`.

## Stack

| Concern | Choice |
|---|---|
| Build | Vite 5 + React 18 + TypeScript strict |
| Routing | React Router v6 |
| Server state | TanStack Query |
| Client state | Zustand |
| Forms | react-hook-form + zod |
| Styling | Tailwind CSS |
| WebSocket | socket.io-client |
| Auth client | Bearer access token in memory; refresh via HttpOnly cookie + silent 401 retry |
| Tables | TanStack Table |
| Date / time | date-fns + date-fns-tz |
| Testing | Vitest + RTL (configured; no specs yet) |

## Quick start

```bash
npm install
cp .env.example .env             # set VITE_API_BASE_URL, VITE_WS_URL
npm run dev                      # http://localhost:5173
```

Vite proxies `/api` + `/auth` to `http://localhost:3000` for local platform-backend dev. In prod, both come from `api.airbotix.ai`.

> **Buttons "do nothing" in local dev?** Almost always a backend 500, not a frontend
> bug — most commonly the local Postgres isn't running, and the only UI feedback is a
> small error banner. `/health` still returns 200 (it doesn't touch the DB). Follow the
> diagnosis chain in the umbrella `rules/local-dev-environment.md` (kid-login probe →
> check `airbotix-pg` → `npm run db:up` in `platform-backend/`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server, port 5173 |
| `npm run build` | tsc -b + vite production build to `dist/` |
| `npm run preview` | preview the built bundle |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, no warnings allowed |
| `npm test` | Vitest unit suite |

## Source layout

```
src/
├── main.tsx                  React entry + QueryClient + RouterProvider
├── app/
│   ├── router.tsx            full route map (all 25 routes)
│   ├── PortalLayout.tsx      parent surface shell (nav drawer + content)
│   ├── PortalNavDrawer.tsx   left nav per parent-portal-prd.md §2
│   ├── LearnLayout.tsx       kid surface shell (top bar + content)
│   └── LearnTopBar.tsx       kid top nav
├── auth/
│   ├── types.ts              AuthPrincipal discriminated union + response shapes
│   ├── authStore.ts          zustand store (in-memory access token)
│   ├── useAuth.ts            useMe + requestOtp/verifyOtp/kidLogin/classCodeLogin/useLogout
│   ├── ProtectedRoute.tsx    redirects + cross-surface bounce by `kind`
│   └── RoleGate.tsx          conditional render by principal kind
├── lib/
│   ├── api.ts                typed fetch with 401 silent refresh (single-flight)
│   └── ws.ts                 socket.io-client wrapper (room subscriptions TODO)
├── components/
│   └── PagePlaceholder.tsx   marker for every not-yet-implemented route
├── pages/
│   ├── RootPage.tsx          `/` redirects by auth state
│   ├── NotFoundPage.tsx
│   ├── portal/               14 pages (3 REAL, 11 placeholder)
│   └── learn/                10 pages (2 REAL, 8 placeholder)
└── styles/
    └── index.css             Tailwind base
```

## Route topology

### Portal (parent, `kind=user`)

| Path | Status | PRD § |
|---|---|---|
| `/portal/login` | ★ real | §3.2 |
| `/portal/verify-otp` | ★ real | §3.2 |
| `/portal/register` | ★ real | §3.1 |
| `/portal` | placeholder | §4.1 Dashboard |
| `/portal/family` | placeholder | §4.2 |
| `/portal/family/new` | placeholder | §4.2 |
| `/portal/family/:kidId` | placeholder | §4.3 |
| `/portal/wallet` | placeholder | §4.4 |
| `/portal/wallet/topup` | placeholder | §4.4 |
| `/portal/approvals` | placeholder | §4.5 |
| `/portal/audit` | placeholder | §4.6 |
| `/portal/audit/project/:id` | placeholder | §4.6 |
| `/portal/settings` | partial | §4.7 — basic profile + sign-out |
| `/portal/billing` | placeholder | §4.8 |

### Learn (kid, `kind=kid`)

| Path | Status | PRD § |
|---|---|---|
| `/learn/login` | ★ real | family code + nickname + PIN |
| `/learn/class-code` | ★ real | one-shot class code |
| `/learn` | placeholder | §4 home |
| `/learn/projects` | placeholder | §5 |
| `/learn/projects/new` | placeholder | §5 |
| `/learn/projects/:id` | placeholder | §5 + §6 editor |
| `/learn/missions` | placeholder | §6 |
| `/learn/missions/:id` | placeholder | §6 |
| `/learn/wall` | placeholder | §7 class wall |
| `/learn/profile` | partial | basic profile + sign-out |

### Shared

| Path | Behaviour |
|---|---|
| `/` | redirect: no auth → `/portal/login`; user → `/portal`; kid → `/learn` |
| `*` | 404 |

## What's implemented vs scaffold

✅ Bootstrap, build pipeline, Tailwind base, type-safe routing
✅ Both auth flows end-to-end (parent OTP + kid PIN + class-code)
✅ First-time family registration wizard
✅ Silent refresh on 401 (single-flight de-dup)
✅ Cross-surface guard (kid can't enter `/portal/*`; parent can't enter `/learn/*`)
✅ Two layouts with role-aware nav
✅ Profile + sign-out + sign-out-everywhere

🚧 19 of 24 business pages are `PagePlaceholder`. Each labelled with its PRD section. Implementation order recommended:
1. Family dashboard + multi-kid manager (`/portal`, `/portal/family/*`)
2. Wallet + Airwallex topup flow (`/portal/wallet`, `/portal/wallet/topup`)
3. Approvals queue + WS push (`/portal/approvals`)
4. Audit feed (`/portal/audit`)
5. Kid project editor (`/learn/projects/:id`) — the actual creative surface

🚧 No WS room subscription yet (`useWebSocket`, `useFamilyAuditStream`). Socket.IO helper installed; wiring deferred.

🚧 Kid-friendly visual identity not yet implemented — uses neutral Tailwind palette. See `airbotix-app-learn-prd.md §UI/UX` for the target.

🚧 No Playwright E2E suite yet.

## Hosting

- AWS S3 bucket `airbotix-app-prod` (ap-southeast-2)
- CloudFront distribution → `app.airbotix.ai`, ACM cert in us-east-1 (`*.airbotix.ai`)
- Cloudflare DNS CNAME `app` → CloudFront (DNS-only, no proxy)
- SPA fallback: 403/404 → `/index.html` 200 with no-cache
- Cache: `index.html` no-cache; `/assets/*` 1-year immutable (Vite hashed filenames)

Deploy workflow: `~/Documents/sites/airbotix/infra/github-actions/deploy-airbotix-app.yml.example` → copy into `.github/workflows/deploy.yml`.

## Sibling repos

```
~/Documents/sites/airbotix/                marketing site + all PRDs
~/Documents/sites/kidsinai/airbotix-app/   THIS REPO
~/Documents/sites/kidsinai/teacher-console/ teacher + admin console
~/Documents/sites/kidsinai/platform-backend/ NestJS+Prisma API
~/Documents/sites/deeprouter-ai/deeprouter/ LLM gateway
```

## License

Proprietary (Airbotix-AI).
