@AGENTS.md

# Grapevine

A daily picture-telephone game that grows one shared tree per day. The design lives in `docs/spec.md` (gitignored and shared privately, so it may be missing on a fresh clone; ask for it). Read the relevant section before building a feature, and update the spec when a decision changes.

## Commands

Always use `make`. Never `npm run`, `npx` or calling binaries directly.

- `make dev`: dev server at http://localhost:3000
- `make check`: format-check, lint, typecheck, test and build, exactly as CI runs them
- `make format` / `make lint-fix`: fix formatting and auto-fixable lint errors
- `make test`: Vitest, once
- `make help`: everything else

Before calling any change done, run `make check` and make sure it passes. If you add a new kind of task (a script, a migration command), add a `make` target for it with a `##` description and list it in the README.

Dependencies: `npm install <pkg>` / `npm install -D <pkg>` is the one npm command you may run. Commit `package-lock.json` with it. Prefer the platform, the standard library and what's already installed before adding a package.

## Stack

- Next.js 16 (App Router, Cache Components on) and React 19, TypeScript strict. This Next.js version differs from older training data; check `node_modules/next/dist/docs/` before using an API you're unsure of.
- Tailwind CSS v4, configured in `src/app/globals.css` (no `tailwind.config`).
- Supabase Postgres + pgvector, production only (no local stack, no Docker). See Database below.
- Vitest for unit tests, ESLint (Next.js config) and Prettier (with the Tailwind class-sorting plugin).
- Deployed on Vercel.

## Architecture rules

All logic runs on the server. The browser only renders and collects input.

```
src/app/          routes only: page.tsx, layout.tsx, api/**/route.ts
src/components/   presentational components
src/server/       all application logic, server-only
src/constants/    constants and tunables
src/types/        shared types
scripts/          standalone scripts
supabase/         migrations
```

- **`src/server/`** holds game logic, validation, database access and calls to external APIs. Every file starts with `import "server-only";` so importing it from client code fails the build.
- **`src/app/`** stays thin. A route handler parses the request, calls a function in `src/server`, and returns `Response.json(...)`. A page fetches through `src/server` and passes data to components. No business logic in either.
- **`src/components/`** render props and handle UI state only (open/closed, the current stroke being drawn). No data fetching, no game rules, no imports from `@/server` (ESLint enforces this). Add `"use client"` only to the components that need interactivity.
- **`src/constants/`** holds every magic number and tunable from the spec: turn limits, time limits, thresholds, weights. Never inline them.
- **Secrets** are read only in `src/server` via `process.env`. Never prefix a secret with `NEXT_PUBLIC_`.
- Import with the `@/` alias (`@/server/health`), not relative paths that climb directories.

## Database

There is one database: Supabase production. Migrations are timestamped SQL files in `supabase/migrations/`, applied with the Supabase CLI, which records each applied version in `supabase_migrations.schema_migrations` so it runs only once. All of it goes through `make db-*` targets, and these project skills cover the workflows:

- `supabase-setup`: log in and link a machine to the project
- `supabase-migration-create`: write a migration
- `supabase-migration-apply`: dry-run, push to prod, regenerate types
- `supabase-triage`: failed pushes, history drift, runtime database errors

Migration hygiene (non-negotiable, because every migration runs straight on prod):

- **Wrap every migration in `begin;` … `commit;`** so a failure rolls back the whole file. The only exception is a statement that can't run in a transaction (`create index concurrently`); it goes alone in its own migration.
- **Every migration is idempotent:** running it twice succeeds and changes nothing the second time. Use `if not exists` / `if exists`, `create or replace`, `on conflict do nothing`, `drop ... if exists` before re-creating policies and constraints, and `do $$ ... exception when duplicate_object` for enum types. The full table of patterns is in the `supabase-migration-create` skill.
- **One logical change per migration**, named for what it does (`make db-migration name=add_guess_count_to_nodes`).
- **Never edit a migration that has been applied** (`make db-status` shows which). Write a new one.
- **Additive first:** add nullable or defaulted columns, backfill, tighten later. Drops, truncates and data-losing type changes need explicit sign-off.
- **Enable RLS on every new `public` table.** The app connects only from `src/server` with the service role.
- **Schema changes only through migration files.** Never through `make db-query`, the dashboard SQL editor or the Supabase MCP (which is configured read-only).
- **Never push to prod without the user's explicit yes** for that push. Then commit the regenerated `src/types/database.ts` with the migration.
- **No real seeds, user data or secrets in migrations.** The repo is public.

## Code style

- Prettier decides formatting; don't fight it.
- Named exports everywhere except where Next.js requires a default export (pages, layouts).
- Small, focused modules named for what they do (`src/server/assignment.ts`, not `utils.ts`).
- Colocate tests as `*.test.ts` next to the module. Test real logic (assignment weighting, clustering, stroke validation), not trivial wrappers.
- Comments explain why, not what.

## This repo is public

Anyone can read every file and every commit, forever. So:

- **Never commit secrets.** API keys and connection strings live in Vercel env vars and an untracked `.env.local` (`.env*` is gitignored).
- **Never commit real seeds or starter drawings.** They are the answers to the game. They live only in the database, entered through the admin page. Tests, fixtures and scripts use made-up seeds; the examples in the spec (SpongeBob, Squirtle, turtle car) are burned and must not be used as real seeds.
- **Server-only code is still public code.** Security can't depend on nobody reading the source: enforce limits on the server, and keep the admin password and any secret moderation tuning in env vars.
- **CI:** workflows trigger on `pull_request` with read-only permissions and no secrets. Never use `pull_request_target`, and never expose secrets to workflows that fork PRs can trigger.

## Git

- Branch from `main`; open a PR; CI must pass before merging.
- Don't commit or push unless asked.
