# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Abapfy** is an Electron desktop app for SAP/ABAP developers. It provides AI-powered tools for code generation, code review, functional spec (EF) authoring, effort estimation, and more. The UI is in Portuguese. Backend is Supabase (PostgreSQL + Auth + RLS).

## Commands

```bash
npm run dev        # Start Electron + Vite dev server with hot reload
npm run build      # Production build (outputs to out/)
npm run package    # Build + create installer (outputs to dist/)
npm run preview    # Preview the production build
```

No test runner, no linter config. The project uses plain JavaScript (no TypeScript).

## Architecture

### Process Model (Electron)

```
Renderer (React/Vite) ←─ contextBridge ─→ Preload (index.js) ←─ IPC ─→ Main Process (index.js)
```

- **Main** (`src/main/index.js`): File I/O, CLI spawning (Claude Code, Codex), DOCX generation, SAP GUI scripting, auto-updater, native notifications. All sensitive operations go here.
- **Preload** (`src/preload/index.js`): Exposes `window.api` — the only bridge between renderer and Node.js.
- **Renderer** (`src/renderer/src/`): React SPA, never accesses Node APIs directly.

### Routing

`HashRouter` is used (required for Electron's `file://` protocol on Windows).

```
/login                    → LoginView
/dashboard
  /                       → Dashboard home
  /abap                   → ABAP generator (5 program types)
  /editor                 → Incremental ABAP editing
  /specs                  → Functional spec (EF) generation
  /estimativas            → Effort estimation
  /performance            → Anti-pattern detection
  /dtec                   → Technical documentation
  /enhancement            → BAdI/User Exit finder (RAG with base_badi.csv)
  /snippets               → ABAP snippet library
  /historico              → Generated programs history
  /settings/*             → AI providers, agents, parameters
  /updates                → Auto-updater UI
  /about                  → About page
```

`ProtectedRoute` redirects unauthenticated users to `/login`. Session is managed by Supabase Auth + `authStore`.

### State Management (Zustand)

12 stores in `src/renderer/src/store/`. Each store fetches from Supabase on `initialize()` or `load*()`. Key stores:

- `authStore` — session, login/logout, inactivity timeout
- `agentStore` — default agents (from Supabase `default_agents` table) + user agents CRUD
- `aiStore` — AI provider configs (API keys, model selection, CLI integration settings)
- `estimativasStore` — effort estimation state
- `especificacoesStore` — EF spec generation state
- `codeReviewStore` — code review sessions (saved to Supabase as JSONB message history)

Flow mappings (which agent is used per module) are persisted in `localStorage` with keys like `abap_flow`, `ef_flow`, `code_review_flow`, etc.

### AI Integration (`src/renderer/src/lib/aiClient.js`)

Multi-provider: Claude API, Gemini, OpenAI, Groq (all via direct HTTP fetch from renderer). CLI integrations (Claude Code agent, Codex) are spawned as child processes in the main process via IPC.

`cleanCode()` strips markdown fences (` ```abap `) from responses before saving/copying.

For streaming (code review chat): main process sends `ai-stream-chunk` IPC events; renderer accumulates chunks.

### Agents System

- **Default agents**: Supabase `default_agents` table (read-only, shared across users). Seeded via `sql/migrations/007_default_agents.sql`.
- **User agents**: Supabase `user_agents` table (full CRUD per user).
- Fallback chain: user agent → default agent → local `ALL_AGENT_PROMPTS` → hardcoded default.
- Agent content is a markdown prompt template with `{{variable}}` placeholders.

### EF (Functional Spec) Generation

Uses a DOCX template (`src/renderer/src/docs/MODELO BASE EF.docx`) with placeholder substitution done in the main process via PizZip (direct XML manipulation). Output saved to `~/Documents/Abapfy/EspecificacoesFuncionais/`.

### ABAP Code Generation

AI returns JSON with `{ files: [{ name, content }] }`. Main process saves `.abap` files to `~/Documents/Abapfy/`. Auto-correction retries up to 5× if SAP GUI scripting reports syntax errors.

### Database (Supabase)

RLS enforced on all tables: `auth.uid() = user_id`. Migrations in `sql/migrations/` (numbered 002–007).

Key tables: `user_agents`, `user_abap_programs`, `user_code_reviews`, `user_ef_specs`, `user_ai_providers`, `default_agents`, `profiles`.

### Design System

SAP Fiori-inspired CSS custom properties in `src/renderer/src/styles/global.css`. Two themes (light/dark) via `themeStore`. Key tokens: `--sap-primary` (#0070f2), `--sap-bg`, `--sap-border`, `--sap-positive`, `--sap-negative`. Font: SAP "72", Arial fallback. No Tailwind, no CSS-in-JS.

Custom titlebar (`frame: false` in BrowserWindow) — window controls (minimize/maximize/close) are implemented via IPC calls.

## Environment

Requires `.env` at project root with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Auto-updater uses a private GitHub release token (`RELEASES_TOKEN` env var at build time).
