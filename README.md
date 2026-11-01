# Grapevine

A daily browser game where the whole internet plays one game of picture telephone, branching into a single shared tree. The design spec lives in `docs/spec.md`, which is gitignored and shared privately.

> This repository is public so the code can be read, but it is not open source. All rights reserved; no license is granted to use, copy or redistribute it. We're not accepting outside contributions.

## Stack

- [Next.js](https://nextjs.org) (App Router) and TypeScript, deployed on [Vercel](https://vercel.com)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Supabase](https://supabase.com) Postgres with pgvector (not wired up yet)
- ESLint, Prettier and Vitest

## Getting started

Requires Node 22 (see `.nvmrc`) and `make`.

```bash
nvm use
make install
make dev
```

The app runs at http://localhost:3000.

## Commands

Everything goes through `make`; there are no `npm run` scripts. Run `make` on its own to list targets.

| Command             | What it does                                      |
| ------------------- | ------------------------------------------------- |
| `make install`      | Install dependencies from the lockfile (`npm ci`) |
| `make dev`          | Start the dev server                              |
| `make build`        | Production build                                  |
| `make start`        | Serve the production build                        |
| `make lint`         | Lint with ESLint                                  |
| `make lint-fix`     | Lint and auto-fix                                 |
| `make format`       | Format all files with Prettier                    |
| `make format-check` | Check formatting without writing                  |
| `make typecheck`    | Generate route types and type-check               |
| `make test`         | Run unit tests                                    |
| `make test-watch`   | Run unit tests in watch mode                      |
| `make check`        | Run everything CI runs                            |
| `make clean`        | Remove build output and `node_modules`            |

Database targets are listed under [Database](#database).

To add a dependency, use `npm install <pkg>` (or `npm install -D <pkg>`) and commit the updated `package-lock.json`.

## Project layout

```
src/
  app/          Routes only: pages, layouts and API route handlers (app/api/)
  components/   Presentational React components; no data fetching or game logic
  server/       All application logic, server-only
  constants/    Shared constants and tunables
  types/        Shared TypeScript types (database.ts is generated)
scripts/        Standalone scripts (simulations, bots, one-off tasks)
supabase/       Supabase CLI config and migrations
docs/           Design docs (gitignored, shared privately)
```

The rule that matters: **logic lives in `src/server`, never in the browser.** Pages and route handlers are thin wrappers that call into `src/server`; components only render what they're given. Every module in `src/server` imports `server-only`, so pulling one into client code fails the build, and ESLint stops `src/components` from importing `src/server`.

## Database

We run against the **production** Supabase project only: no local Supabase stack, no Docker. Schema changes are timestamped SQL migrations in `supabase/migrations/`, applied with the Supabase CLI (a dev dependency). The CLI records every applied migration in the `supabase_migrations.schema_migrations` table on prod, so each one runs exactly once.

**One-time setup per machine**

```bash
make db-login
make db-link ref=<project-ref>
```

The project ref is the id in the dashboard URL. The link is stored in `supabase/.temp/`, which is gitignored.

**Making a schema change**

```bash
make db-migration name=add_guess_count_to_nodes   # creates supabase/migrations/<timestamp>_add_guess_count_to_nodes.sql
make db-status                                     # local files vs what prod has applied
make db-push-dry                                   # what a push would run
make db-push                                       # apply pending migrations to prod
make db-types                                      # regenerate src/types/database.ts
```

Commit the migration and the regenerated types together.

**Migration rules**

- Wrap every migration in `begin;` … `commit;` so a failure rolls back the whole file.
- Every migration is idempotent: `if not exists`, `create or replace`, `on conflict do nothing` and friends, so running it twice is harmless.
- Never edit a migration that's already applied; write a new one.
- Prefer additive changes; drops and data-losing changes get a second pair of eyes.
- Schema changes only through migrations, never the dashboard SQL editor.
- No real seeds or user data in migrations; this repo is public.

| Command                                   | What it does                                                 |
| ----------------------------------------- | ------------------------------------------------------------ |
| `make db-login`                           | Log the Supabase CLI in                                      |
| `make db-link ref=<ref>`                  | Link this checkout to the prod project                       |
| `make db-migration name=<name>`           | Create an empty timestamped migration                        |
| `make db-status`                          | Local migrations vs applied on prod                          |
| `make db-push-dry`                        | Show what `db-push` would apply                              |
| `make db-push`                            | Apply pending migrations to prod                             |
| `make db-repair version=<ts> status=<s>`  | Mark a migration `applied` or `reverted` in history (no SQL) |
| `make db-types`                           | Regenerate `src/types/database.ts`                           |
| `make db-query sql="..."` / `file=<path>` | Run a SQL query on prod (for reads and debugging)            |
| `make db-advisors`                        | Security and performance checks on prod                      |

**Claude Code** has project skills in `.claude/skills/` for these workflows: `supabase-setup`, `supabase-migration-create`, `supabase-migration-apply` and `supabase-triage`. `.mcp.json` adds the Next.js dev-tools, Supabase (read-only) and Vercel MCP servers.

## Conventions

- **Branches:** `name/feature`, lowercase with hyphens, e.g. `varun/guess-clustering`.
- **Commits and PR titles:** [Conventional Commits](https://www.conventionalcommits.org), `type(scope): summary` with an optional scope.

  | Type       | For                                     |
  | ---------- | --------------------------------------- |
  | `feat`     | A new feature                           |
  | `fix`      | A bug fix                               |
  | `chore`    | Maintenance, dependencies, config       |
  | `docs`     | Documentation only                      |
  | `refactor` | Code change that isn't a feature or fix |
  | `test`     | Adding or fixing tests                  |
  | `ci`       | CI workflows                            |
  | `perf`     | Performance                             |
  | `build`    | Build system or tooling                 |
  | `revert`   | Reverting a previous commit             |

  Add `!` for breaking changes: `feat(api)!: rename turns endpoint`.

- **Merging:** squash merge only, so the PR title becomes the commit on `main`. The **Conventions** workflow fails a PR whose title or branch name doesn't match.

## CI

GitHub Actions runs one workflow per check on every pull request and push to `main`: **Lint**, **Format**, **Typecheck**, **Test** and **Build**. Each calls the matching `make` target, so `make check` locally reproduces CI. A sixth workflow, **Conventions**, checks PR titles and branch names. Dependabot opens weekly update PRs for npm packages and GitHub Actions.

## Deployment

Vercel builds from `main` and creates a preview deploy for every branch. Vercel picks Node 22 from `engines` in `package.json` and runs `npm run build`, which is the one npm script kept for that purpose.
