# Repository Guidelines

## Project Structure & Modules
- `src/`: React + TypeScript app (Vite). Components use PascalCase (`RetroTV.tsx`); utilities and stores use camelCase (`sfzLoader.ts`, `stocks.ts`). Tests live alongside files as `*.test.ts(x)`.
- `src-tauri/`: Tauri (Rust) backend with integration/unit tests under `src-tauri/tests`. Python helpers live in `src-tauri/python/` with tests in `src-tauri/python/tests`.
- `scripts/`: TypeScript maintenance scripts (run via `tsx`), e.g. `reindex.ts`, `gen-schemas.ts`.
- `public/`, `assets/`, `models/`: static assets and data.

## Build, Test, and Dev Commands
- Frontend dev: `npm run dev` (Vite) — runs the web UI only.
- Desktop dev: `npm run tauri dev` — launches the full Tauri app.
- Build app: `npm run build` (UI bundle) and `npm run tauri build` (desktop bundle).
- JS tests: `npm test` (Vitest + jsdom). CI uses `npm test -- --run` for non-watch.
- Rust tests: `cargo test` (run in `src-tauri`).
- Python tests: `pytest src-tauri/python/tests` (requires `pip install -r requirements-dev.txt`).
- Utilities: `npm run db:migrate`, `npm run schemas:generate`, `npm run npc:gen`, `npm run items:enrich`, `npm run sfz:flac2wav`.

## Coding Style & Conventions
- TypeScript: strict mode enforced via `tsconfig.json`; prefer 2-space indent; components in PascalCase; hooks/utilities in camelCase; colocate tests as `*.test.ts(x)`.
- Rust: default `rustfmt` style; follow idiomatic module naming (snake_case) and keep commands async-friendly (Tokio used).
- Python: follow PEP 8; keep pure functions testable; place new tests under `src-tauri/python/tests`.

## Testing Guidelines
- Frontend: Vitest with React Testing Library; test user-visible behavior and store logic. Name tests after the unit (`ComponentName.test.tsx`, `utilName.test.ts`).
- Backend: add Rust tests near modules or under `src-tauri/tests` for integration. Python tests cover renderers, parsers, and tools.

## Commit & Pull Request Guidelines
- Messages: Prefer Conventional Commits (e.g., `feat:`, `fix:`, `refactor:`, optional scope like `feat(voices):`). Keep the first line under 72 chars; add context in the body when needed.
- PRs: describe intent and approach, link related issues, include screenshots/GIFs for UI changes, and list manual test steps. Ensure `npm test`, `pytest`, and `cargo test` pass locally.

## Security & Configuration Tips
- Never commit secrets. Use `.env` (see `.env.example`) for keys like `ALPHAVANTAGE_API_KEY`; configure optional providers (e.g., Twelve Data) via env.
- FFmpeg and Tesseract must be on `PATH` for audio/OCR features; set `BLENDER_PATH` if needed.
