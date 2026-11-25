# Grapevine

A daily browser game where the whole internet plays one game of picture telephone, branching into a single shared tree. The design spec lives in `docs/spec.md`, which is gitignored and shared privately.

> This repository is public so the code can be read, but it is not open source. All rights reserved; no license is granted to use, copy or redistribute it. We're not accepting outside contributions.

## Stack

- [Next.js](https://nextjs.org) (App Router) and TypeScript, deployed on [Vercel](https://vercel.com)
- [Tailwind CSS](https://tailwindcss.com) v4
- [Supabase](https://supabase.com) Postgres (MVP game persistence wired up; pgvector and the daily-tree schema are planned)
- ESLint, Prettier and Vitest

## Getting started

Requires Node 22 (see `.nvmrc`) and GNU Make. The Makefile works on Windows, macOS and Linux; on Windows, use GNU Make (for example, from Git Bash or WSL).

```bash
nvm use
make install
```

Start the local database (needs Docker running; the first start downloads images):

```bash
make db-start
make db-status   # prints the local URL and keys
```

Copy `.env.example` to `.env.local` and set:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` from `make db-status`. The secret key is server-only, bypasses row-level security, and must never use a `NEXT_PUBLIC_` prefix. Vercel holds the prod values.
- `OPENAI_API_KEY` for guess clustering (embeddings). Server-only. Without it the game still works, and every guess starts its own cluster.

For the admin pages (`/debug`), create a user in local Studio at http://localhost:54323 (Authentication → Add user).

```bash
make dev
```

The app runs at http://localhost:7300. Use `make dev PORT=<port>` to pick another.

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

The homepage is the player-facing route: the MVP is two-player telephone along a single line. Whoever didn't make the latest node guesses it (a drawing) or draws it (a guess), and the other waits. `/tree` is a pannable, zoomable whiteboard of the whole game: the secret prompt (behind a reveal) at the top, with hand-drawn arrows down through every drawing and guess. Drag or scroll to move, pinch or ctrl-scroll to zoom; arrow keys, `+`, `-` and `0` work too.

The **Playing as Player A / Player B** switcher in the top bar lets one person play both sides in one browser; two people on two devices can each pick a side, or just play with their own cookie. `/tree?date=YYYY-MM-DD` opens a specific game's tree. Drawings are stored as the spec's 512 × 512 stroke JSON, not image embeddings.

To add a dependency, use `npm install <pkg>` (or `npm install -D <pkg>`) and commit the updated `package-lock.json`.

## Project layout

```
src/
  app/          Routes only: pages, layouts and API route handlers (app/api/)
  components/   Presentational React components; no data fetching or game logic
  server/
    days/       Day setup and day lifecycle logic
    drawings/   Drawing data validation
    health/     Health endpoint logic
    shared/     API, errors, database and environment helpers
  constants/    Shared constants and tunables
  types/        Shared TypeScript types (database.ts is generated)
scripts/        Standalone scripts (simulations, bots, one-off tasks)
supabase/       Supabase CLI config and migrations
docs/           Design docs (gitignored, shared privately)
```

The rule that matters: **logic lives in `src/server`, never in the browser.** Server modules are grouped by feature, with cross-cutting infrastructure in `src/server/shared/`. Pages and route handlers are thin wrappers that call into `src/server`; components only render what they're given. Every module in `src/server` imports `server-only`, so pulling one into client code fails the build, and ESLint stops `src/components` from importing `src/server`.

## Database

Development runs against a **local Supabase stack in Docker**, built from the timestamped SQL migrations in `supabase/migrations/`. Prod changes only by merging: nobody pushes migrations from a laptop.

**Making a schema change**

```bash
make db-migration name=add_guess_count_to_nodes   # creates supabase/migrations/<timestamp>_add_guess_count_to_nodes.sql
make db-reset                                      # rebuild the local database from every migration
make db-types                                      # regenerate src/types/database.ts
```

Commit the migration and the regenerated types together, and open a PR.

- **On every PR**, the Database check applies every migration to a fresh database and fails if `src/types/database.ts` doesn't match. It uses no secrets.
- **On merge to `main`**, the Deploy database workflow applies the new migrations to prod with `supabase db push`. Its secrets (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_ID`) live in the GitHub `production` environment.

**Migration rules**

- Wrap every migration in `begin;` … `commit;` so a failure rolls back the whole file.
- Every migration is idempotent: `if not exists`, `create or replace`, `on conflict do nothing` and friends, so running it twice is harmless.
- Never edit a migration once it's merged; write a new one.
- Prefer additive changes. CI tests on an empty database, so only prod finds data problems; drops and data-losing changes get a second pair of eyes.
- Schema changes only through migrations, never the dashboard SQL editor.
- No real seeds or user data in migrations; this repo is public.

| Command                                    | What it does                                                     |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `make db-start` / `make db-stop`           | Start or stop the local stack (Studio: http://localhost:54323)   |
| `make db-status`                           | The local stack's URLs and keys                                  |
| `make db-reset`                            | Rebuild the local database from every migration (wipes data)     |
| `make db-up`                               | Apply only new migrations locally, keeping data                  |
| `make db-migration name=<name>`            | Create an empty timestamped migration                            |
| `make db-types`                            | Regenerate `src/types/database.ts` from the local database       |
| `make db-check`                            | What the CI check runs                                           |
| `make db-deploy`                           | What the deploy workflow runs (CI only)                          |
| `make db-login` / `make db-link ref=<ref>` | Connect the CLI to prod, once per machine, for the targets below |
| `make db-prod-migrations`                  | Migration files next to what prod has applied                    |
| `make db-query sql="..."` / `file=<path>`  | A read-only SQL query on prod                                    |
| `make db-advisors`                         | Security and performance checks on prod                          |
| `make db-repair version=<ts> status=<s>`   | Emergencies: mark a migration applied or reverted on prod        |

**Claude Code** has project skills in `.claude/skills/` for these workflows: `supabase-setup`, `supabase-migration` and `supabase-triage`. `.mcp.json` adds the Next.js dev-tools, Supabase (read-only) and Vercel MCP servers.

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
