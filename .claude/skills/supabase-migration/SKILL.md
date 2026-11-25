---
name: supabase-migration
description: Change the Grapevine database schema (tables, columns, indexes, enums, functions, RLS policies) with a migration, test it locally and ship it. Use whenever the schema needs to change. Every schema change goes through a migration file, and merging it into main is what deploys it to prod.
---

# Write and ship a migration

Migrations are timestamped SQL files in `supabase/migrations/`. They're the only record of the schema. They run on your local database while you work, in CI on every PR, and on prod when the PR merges.

## Steps

1. **Read the context.** Check `docs/spec.md` (Data model), the existing migrations and `src/types/database.ts`, so the new migration builds on what's there. Make sure the local stack is running (`make db-start`; see `supabase-setup`).

2. **Create the file:**

   ```bash
   make db-migration name=<snake_case_description>
   ```

   Name it for what it does: `add_guess_count_to_nodes`, `index_guesses_on_drawing_id`.

3. **Write the SQL**, following the rules below.

4. **Apply it locally:**

   ```bash
   make db-reset
   ```

   This rebuilds the local database from every migration, so it fails on any error, in this file or an earlier one. Use `make db-up` instead if you want to keep local test data; it applies only the new file.

5. **Regenerate the types** and fix any code they break:

   ```bash
   make db-types
   make check
   ```

6. **Commit the migration and `src/types/database.ts` together** in the PR. In the PR description, say what the migration does and flag anything destructive (drops, truncates, type changes, `not null` on existing columns): merging is the deploy, so the review is the approval.

7. **CI** (`.github/workflows/database.yml`) applies every migration to a fresh database and fails if the committed types don't match.

8. **On merge**, `.github/workflows/deploy-database.yml` applies the new migrations to prod. Check that the run is green. If it fails, use `supabase-triage`.

## Rules

- **One logical change per migration.** Easier to review and to fix forward.
- **Never edit a migration once it's merged.** Prod has run it (`make db-prod-migrations` shows what prod has). Write a new migration.
- **Wrap every migration in `begin;` … `commit;`** so a failure anywhere rolls the whole file back. The only exception is a statement that can't run in a transaction (`create index concurrently`, `vacuum`): put it alone in its own migration without `begin`/`commit`, and say so in the PR.
- **Every migration is idempotent:** running it twice must succeed and change nothing the second time. Guard every statement:

  | Change                  | Idempotent form                                                                       |
  | ----------------------- | ------------------------------------------------------------------------------------- |
  | Table                   | `create table if not exists`                                                          |
  | Column                  | `alter table ... add column if not exists` / `drop column if exists`                  |
  | Index                   | `create index if not exists` / `drop index if exists`                                 |
  | Extension               | `create extension if not exists`                                                      |
  | Function, view, trigger | `create or replace function` / `create or replace view` / `create or replace trigger` |
  | Enum type               | `do $$ begin create type ...; exception when duplicate_object then null; end $$;`     |
  | Enum value              | `alter type ... add value if not exists`                                              |
  | Constraint              | `alter table ... drop constraint if exists ...;` then `add constraint ...`            |
  | Policy                  | `drop policy if exists ... on ...;` then `create policy ...`                          |
  | Seed or lookup rows     | `insert ... on conflict do nothing`                                                   |
  | Backfill                | `update ... where <column> is null` (only touches rows not yet done)                  |

- **Additive first; prod has live data, and CI only tests on an empty database.** A migration can pass CI and still fail on prod's data, so:
  - Add a column as nullable or with a default; backfill; add `not null` in a later migration.
  - Rename = add new, backfill, switch code, drop old later. Never rename in place while code uses the old name.
  - `drop table`, `drop column`, `truncate`, and type changes that rewrite or lose data need the user's explicit sign-off.
- **Code and schema deploy at the same time** on merge: Vercel builds while the migration runs. Code must work with both the old and new schema for that minute. If it can't, merge the migration in its own PR first.
- **Row Level Security:** enable RLS on every new table in `public`. The app talks to Postgres only from `src/server` with `SUPABASE_SECRET_KEY`, so tables need no policies for anon users. A table without RLS is readable by anyone holding the publishable key.
- **Functions:** `set search_path = ''` and schema-qualify names. Revoke `execute` from `public, anon, authenticated` when only the server calls it.
- **pgvector:** `create extension if not exists vector with schema extensions;` before the first `vector` column, and write the type as `extensions.vector(n)`.
- **No real game data.** Never put real seeds, starter drawings or user data in a migration. The repo is public, and seeds are the answers.
- **No secrets** in SQL files.
- Lowercase SQL keywords, snake_case names, and a short comment at the top saying why the migration exists.

## Template

```sql
-- Why: clustering needs to know how many guesses each cluster holds (spec: Guess clustering).

begin;

alter table public.guesses add column if not exists guess_count int not null default 0;

create index if not exists guesses_drawing_id_idx on public.guesses (drawing_id);

commit;
```

## Never

- Never change the schema any other way: not `make db-query` (it's read-only on prod anyway), not the Supabase dashboard's SQL editor, not the Supabase MCP. Those leave no migration file, and the repo drifts from prod.
- Never push migrations to prod from a laptop. Merging is the only path.
