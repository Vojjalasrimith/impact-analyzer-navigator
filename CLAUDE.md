# AI Project Dependency Navigator

30-hour POC: a tool where a developer can model projects/features/services/developers and their
dependencies, then ask "what could be affected if I change this service?" and get an AI-generated
impact analysis.

## Core Flow

```text
React → Express (backend/) → CognoDB traversal → structured graph context → Gemini → impact analysis → React
```

## Repo Layout (npm workspaces monorepo)

```text
package.json     ← root: workspaces=[backend,frontend], single entry point
backend/         ← Express + TypeScript API — see backend/CLAUDE.md
frontend/        ← React + Vite SPA — see frontend/CLAUDE.md
```

- `npm run dev` — starts backend (`tsx watch`, :5000) and frontend (Vite, :5173) together via `concurrently`. Both watch/hot-reload.
- `npm run build` — builds frontend then backend.
- `npm start` (`NODE_ENV=production`) — single process: `node dist/server.js` serves the API and the built frontend (`frontend/dist`) on one port. No watching in production — rebuild + restart to pick up changes.
- Frontend calls the API via relative `/api/...` paths (see `frontend/src/services/api.ts`); Vite's dev proxy forwards `/api` to the backend, and in production they're same-origin.

## Architecture Boundaries (do not blur these)

- **MongoDB** (Mongoose): registry of entity documents only — `ID`, `Type` (`PROJECT` | `FEATURE` | `SERVICE` | `DEVELOPER`), `Name`, `Description`. No relationship data.
- **CognoDB**: graph/topology engine, directed edges only:
  - `PROJECT --HAS_FEATURE--> FEATURE`
  - `FEATURE --IMPLEMENTED_BY--> SERVICE`
  - `SERVICE --DEPENDS_ON--> SERVICE`
  - `SERVICE --OWNED_BY--> DEVELOPER`
- **Gemini**: stateless reasoning only. It never queries a database or does pathfinding — the backend traverses CognoDB, compiles structural facts, and sends those to Gemini for risk scores / test recommendations / impact explanations.

## POC Scope Constraints

- **No auth**: all routes stay public — no login, sessions, or roles.
- **No vector DB / RAG**: CognoDB traversal is the only retrieval mechanism.
- **No complex graph layout**: relationships are created via form dropdowns, not node dragging; no auto-layout engines (Dagre, D3-force). Nodes can be dragged manually on canvas.
- **No microservices**: one backend process, one frontend SPA (this monorepo).
- **No Redux/Zustand**: native React `useState`/`useContext` is sufficient.
- **TypeScript strict, no `any`**: define real interfaces/types on both sides.
- Don't add dependencies beyond what's already in `backend/package.json` / `frontend/package.json` without asking — keep the POC footprint minimal.

## Reference docs

- `arc-plan.md` — original POC goal/scope writeup.
- `implementation_plan.md` — minimal architecture proposal, type definitions, open questions.

See `backend/CLAUDE.md` and `frontend/CLAUDE.md` for package-specific conventions.
