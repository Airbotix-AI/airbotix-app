# kidsinai/creative-web

> Low-age (6–11) creative AI platform. AI image / music / story creation in a safe, parent-monitored space.

Part of the **[Kids in AI](https://github.com/kidsinai)** Layer-2 platform. Pairs with [`opencode`](https://github.com/kidsinai/opencode) (12+ agentic coding flagship) and [`platform-backend`](https://github.com/kidsinai/platform-backend) (shared Family Account / Stars wallet / Course Pack runtime).

## Quick start

```bash
pnpm install        # or npm install
cp .env.example .env
pnpm dev            # http://localhost:5173
```

## Stack

- React 18 + Vite + TypeScript
- TailwindCSS (Lovable-inspired cream palette — `cream #f7f4ed`, `charcoal #1c1c1c`)
- React Router v6
- Talks to `platform-backend` (no direct LLM provider calls from the frontend — all LLM goes through DeepRouter via the backend)

## Status

V0 scaffold. See `CLAUDE.md` for full project context + roadmap.

## License

MIT
