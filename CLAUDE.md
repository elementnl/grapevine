@AGENTS.md

# Grapevine

A daily picture-telephone game that grows one shared tree per day. The design lives in `docs/spec.md` (gitignored and shared privately, so it may be missing on a fresh clone; ask for it). Read the relevant section before building a feature, and update the spec when a decision changes.

## Commands

Always use `make`. Never `npm run`, `npx` or calling binaries directly.

- `make dev`: dev server at http://localhost:7300 (`PORT=` to override)
- `make check`: format-check, lint, typecheck, test and build, exactly as CI runs them
- `make format` / `make lint-fix`: fix formatting and auto-fixable lint errors
- `make test`: Vitest, once
- `make help`: everything else

Before calling any change done, run `make check` and make sure it passes. If you add a new kind of task (a script, a migration command), add a `make` target for it with a `##` description and list it in the README.

Dependencies: `npm install <pkg>` / `npm install -D <pkg>` is the one npm command you may run. Commit `package-lock.json` with it. Prefer the platform, the standard library and what's already installed before adding a package.

## Stack

- Next.js 16 (App Router, Cache Components on) and React 19, TypeScript strict. This Next.js version differs from older training data; check `node_modules/next/dist/docs/` before using an API you're unsure of.
- Tailwind CSS v4, configured in `src/app/globals.css` (no `tailwind.config`).
- Supabase Postgres + pgvector: a local stack in Docker for development, production on Supabase. See Database below.
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

Development runs against a local Supabase stack in Docker (`make db-start`), built from the timestamped SQL migrations in `supabase/migrations/`. Prod changes only by merging: the Database check applies every migration to a fresh database on each PR, and the Deploy database workflow applies new ones to prod when they reach `main`. The Supabase CLI records each applied version in `supabase_migrations.schema_migrations`, so it runs only once. All of it goes through `make db-*` targets, and these project skills cover the workflows:

- `supabase-setup`: the local stack, `.env.local`, and linking a machine to prod for debugging
- `supabase-migration`: write a migration, test it locally, ship it through a PR
- `supabase-triage`: failed checks or deploys, history drift, runtime database errors

Migration hygiene (non-negotiable, because merging runs every migration on prod, and CI only tests on an empty database):

- **Wrap every migration in `begin;` … `commit;`** so a failure rolls back the whole file. The only exception is a statement that can't run in a transaction (`create index concurrently`); it goes alone in its own migration.
- **Every migration is idempotent:** running it twice succeeds and changes nothing the second time. Use `if not exists` / `if exists`, `create or replace`, `on conflict do nothing`, `drop ... if exists` before re-creating policies and constraints, and `do $$ ... exception when duplicate_object` for enum types. The full table of patterns is in the `supabase-migration` skill.
- **One logical change per migration**, named for what it does (`make db-migration name=add_guess_count_to_nodes`).
- **Never edit a migration once it's merged** (`make db-prod-migrations` shows what prod has). Write a new one.
- **Additive first:** add nullable or defaulted columns, backfill, tighten later. Drops, truncates and data-losing type changes need explicit sign-off.
- **Enable RLS on every new `public` table.** The app connects only from `src/server` with the Supabase secret key, which bypasses RLS.
- **Schema changes only through migration files.** Never through the dashboard SQL editor or the Supabase MCP (which is configured read-only); `make db-query` is read-only on prod.
- **Merging is the deploy.** Never push migrations to prod from a laptop. Commit the migration with `src/types/database.ts` regenerated from the local database (`make db-reset db-types`), and flag anything destructive in the PR description: the review is the approval.
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
- **CI:** workflows trigger on `pull_request` with read-only permissions and no secrets. Never use `pull_request_target`, and never expose secrets to workflows that fork PRs can trigger. The one exception is `deploy-database.yml`: it runs only on pushes to `main`, and its Supabase secrets live in the GitHub `production` environment.

## Git

- Branch from `main` as `name/feature`: lowercase, hyphens, e.g. `varun/guess-clustering`.
- Commit messages and PR titles use Conventional Commits: `type(scope): summary`, scope optional, summary lowercase and imperative. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `perf`, `build`, `revert`; add `!` after the type or scope for breaking changes. Examples: `feat(assignment): weight nodes by height`, `fix(canvas): stop strokes past the edge`, `chore(deps): bump next`.
- PRs are squash-merged, so the PR title becomes the commit on `main`. The Conventions workflow checks the title and branch name on every PR.
- CI must pass before merging.
- Don't commit or push unless asked.
