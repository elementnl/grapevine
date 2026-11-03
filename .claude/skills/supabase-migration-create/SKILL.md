---
name: supabase-migration-create
description: Write a new database migration for Grapevine (tables, columns, indexes, enums, functions, RLS policies). Use whenever the schema needs to change. Every schema change goes through a migration file; never change the prod schema any other way.
---

# Create a migration

Migrations are timestamped SQL files in `supabase/migrations/`. They are the only record of the schema, and they run directly against production, so write them carefully.

## Steps

1. **Read the context.** Check `docs/spec.md` (Data model) and the existing files in `supabase/migrations/` so the new migration builds on what is already there. If `src/types/database.ts` exists, it shows the current prod schema.

2. **Create the file:**

   ```bash
   make db-migration name=<snake_case_description>
   ```

   Names describe the change: `create_days_and_nodes`, `add_guess_count_to_nodes`, `index_guesses_on_drawing_id`.

3. **Write the SQL** in the new file, following the rules below.

4. **Review it with the user.** Show the full SQL and say what it changes and whether any step is destructive. Don't apply it; that's the `supabase-migration-apply` skill, and only once the user agrees.

5. **Update `docs/spec.md`** if the schema in the spec no longer matches.

## Rules

- **One logical change per migration.** Easier to review, and easier to fix forward if it fails.
- **Never edit a migration that has been applied.** Check with `make db-status`. If it's applied, write a new migration instead.
- **Wrap every migration in `begin;` … `commit;`** so a failure anywhere rolls the whole file back and prod is never left half-migrated. Statements that can't run in a transaction (`create index concurrently`, `vacuum`) are the only exception: put such a statement alone in its own migration without `begin`/`commit`, and tell the user.
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

- **Additive first; prod has live data.**
  - Add a column as nullable or with a default; backfill; add `not null` in a later migration.
  - Rename = add new, backfill, switch code, drop old later. Never rename in place while code uses the old name.
  - `drop table`, `drop column`, `truncate`, and type changes that rewrite or lose data need the user's explicit sign-off.
- **Row Level Security:** enable RLS on every new table in `public`. The app talks to Postgres only from `src/server` using `SUPABASE_SECRET_KEY`, so tables need no policies for anon users. A table without RLS is readable by anyone holding the public anon key.
- **pgvector:** `create extension if not exists vector with schema extensions;` before the first `vector` column.
- **No real game data.** Never put real seeds, starter drawings or user data in a migration. The repo is public, and seeds are the answers.
- **No secrets** in SQL files.
- Lowercase SQL keywords, snake_case names, and a short comment at the top saying why the migration exists.

## Template

```sql
-- Why: clustering needs to know how many guesses each cluster holds (spec: Guess clustering).

begin;

alter table public.nodes add column if not exists guess_count int not null default 0;

create index if not exists nodes_parent_id_idx on public.nodes (parent_id);

commit;
```
