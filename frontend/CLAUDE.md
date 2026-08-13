Frontend package. See root `../CLAUDE.md` first for architecture boundaries and POC constraints —
this file only covers frontend-specific conventions.

## Stack

React 19 + Vite + TypeScript. Graph visuals via React Flow (`@xyflow/react`). No Tailwind config
present yet — plain CSS (`App.css`, `index.css`) is the current styling approach.

## Structure

- `src/main.tsx` — app entry point.
- `src/App.tsx` — top-level layout/state.
- `src/components/` — `GraphCanvas` (React Flow canvas), `Sidebar`, `Modals` (create/edit forms).
- `src/services/api.ts` — all backend calls. `API_BASE_URL` defaults to relative `/api` (proxied to the backend by Vite in dev — see root `vite.config.ts` — and same-origin in production); override with `VITE_API_URL` only if pointing at a different host.
- `src/types/index.ts` — shared frontend types (`Entity`, `Relationship`, `GraphData`, `ImpactAnalysisResult`) — keep these in sync with backend response shapes.

## Conventions

- State: native `useState`/`useContext` only — no Redux/Zustand.
- Graph layout: no auto-layout engines (Dagre, D3-force). Relationships are created through form
  dropdowns in `Modals.tsx`, not by dragging connections; users may still drag node positions
  manually on the canvas.
- Keep React Flow nodes simple and color-coded by entity type rather than building custom complex
  node renderers.
- Strict TypeScript, no `any`.
