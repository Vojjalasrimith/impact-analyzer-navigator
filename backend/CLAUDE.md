Backend package. See root `../CLAUDE.md` first for architecture boundaries and POC constraints —
this file only covers backend-specific conventions.

## Stack

Node.js + Express + TypeScript, run via `tsx watch` in dev (no separate build step needed locally).
ESM (`"type": "module"`) — relative imports need explicit `.js` extensions even in `.ts` source.

## Structure

- `server.ts` — app entry point: middleware, route mounting, DB/CognoDB connection bootstrap, prod static-serving.
- `src/config/` — DB connection setup.
- `src/models/` — Mongoose schemas (entity registry only — see root boundaries).
- `src/routes/` — one router per resource (`entityRoutes`, `relationshipRoutes`, `graphRoutes`, `impactRoutes`).
- `src/controllers/` — request handlers backing the routers.
- `src/services/` — `cognoService` (graph traversal), Gemini integration.
- `src/types/` — shared backend type definitions.
- `src/utils/seeder.ts` — auto-seeds the DB on empty startup.

## Conventions

- Every route returns JSON; errors flow through the centralized error middleware at the bottom of `server.ts`, returning `{ error: string }`.
- Strict TypeScript, no `any` — define request/response interfaces for new endpoints.
- New env vars go through `dotenv` (`process.env.X`), documented with a default fallback where reasonable (see `MONGODB_URI`, `PORT` in `server.ts`).
- Gemini calls must only receive pre-compiled structural facts from CognoDB traversal — never let Gemini code query MongoDB/CognoDB directly.
