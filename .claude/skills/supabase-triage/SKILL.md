---
name: supabase-triage
description: Diagnose and fix Grapevine database problems - a failed migration push, migration history out of sync with supabase/migrations, schema drift, CLI auth or link errors, or runtime database errors from the app (missing column, permission denied, RLS, slow queries). Use before retrying anything that failed against the database.
---

# Triage database issues

The database is production, so diagnose with read-only commands first and change nothing until you know the cause. Every fix that writes (a new migration, a push, a history repair) needs the user's explicit approval.

## Read-only tools

| Command                   | Shows                                               |
| ------------------------- | --------------------------------------------------- |
| `make db-status`          | Local migration files next to what prod has applied |
| `make db-push-dry`        | What a push would run right now                     |
| `make db-query sql="..."` | Result of a **read-only** query (`select` only)     |
| `make db-advisors`        | Security and performance warnings (RLS, indexes)    |
| `src/types/database.ts`   | The schema as of the last `make db-types`           |

Useful queries:

```sql
-- Migration history as prod records it
select version, name from supabase_migrations.schema_migrations order by version;

-- Columns of a table
select column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public' and table_name = 'nodes';

-- Tables without RLS
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
```

Use `make db-query` only for reads. Writing with it bypasses migrations.

## Common problems

**CLI errors: not logged in, not linked, password or permission prompts.** Use the `supabase-setup` skill.

**A push failed partway.** Each file is wrapped in `begin`/`commit`: earlier files are applied, the failing one was rolled back entirely. If the failing file was missing its `begin`/`commit`, part of it may have run: check with queries, and rely on its statements being idempotent so it can safely run again once fixed. Read the error, fix the SQL in the failing file (it was never applied, so editing it is allowed), run `make db-push-dry`, then apply with the `supabase-migration-apply` skill.

**`db-status` shows a migration on prod that has no local file.** Someone applied SQL outside the repo, or a teammate's migration isn't pulled yet. First `git pull` and check other branches. If it truly came from outside the repo, ask the user how it happened, then recreate the change as a local file with the same version number. Never delete prod history to make the error go away.

**A local migration was already applied by hand** (for example in the dashboard), so pushing it would fail or run twice. Confirm with queries that its changes really are on prod, then, with the user's OK, mark it applied without running it:

```bash
make db-repair version=<timestamp> status=applied
```

**A recorded migration whose changes were undone by hand.** Confirm with queries, then with the user's OK:

```bash
make db-repair version=<timestamp> status=reverted
```

`db-repair` only edits the history table; it never runs SQL. Use it only after a query proves what's actually on prod.

**An applied migration was edited locally.** Prod already ran the original. Restore the file from git (`git log -p -- supabase/migrations/<file>`) and put the intended change in a new migration.

**App errors such as `column ... does not exist` or `relation ... does not exist`.** Usually a migration was merged but not pushed, or pushed but types weren't regenerated. Check `make db-status`, push if pending (with approval), then `make db-types`.

**`permission denied` or an empty result from the app.** Check that server code uses the service-role client, and check RLS on the table. Never "fix" it by disabling RLS or granting `anon` access without the user's sign-off.

**Slow queries or advisor warnings.** Run `make db-advisors`, then fix with a migration (typically an index) through `supabase-migration-create`.

## Report back

Tell the user what was wrong, the evidence (command output or query results), what you changed, and what still needs their decision.
