---
name: supabase-triage
description: Diagnose and fix Grapevine database problems - a failed migration deploy on merge, a red Database check on a PR, migration history out of sync, a local stack that won't start, schema drift, CLI auth or link errors, or runtime database errors from the app (missing column, permission denied, RLS, slow queries). Use before retrying anything that failed against a database.
---

# Triage database issues

Diagnose before changing anything. Locally you can reset freely. Prod is changed only by merging a migration; every fix that touches prod history (`db-repair`) needs the user's explicit approval.

## Tools

| Command                            | Shows                                                 |
| ---------------------------------- | ----------------------------------------------------- |
| `make db-status`                   | Whether the local stack is up, and its URLs and keys  |
| `make db-reset`                    | Rebuilds the local database from the migrations       |
| `make db-prod-migrations`          | Migration files next to what prod has applied         |
| `make db-query sql="..."`          | A read-only query on prod (writes are refused)        |
| `make db-advisors`                 | Prod security and performance warnings (RLS, indexes) |
| `gh run list -w "Deploy database"` | Recent prod deploys; `gh run view <id> --log-failed`  |
| `src/types/database.ts`            | The schema the migrations produce                     |

The prod targets need the CLI logged in and linked (`supabase-setup`).

Useful queries:

```sql
-- Migration history as prod records it
select version, name from supabase_migrations.schema_migrations order by version;

-- Columns of a table
select column_name, data_type, is_nullable, column_default
from information_schema.columns where table_schema = 'public' and table_name = 'guesses';

-- Tables without RLS
select tablename from pg_tables where schemaname = 'public' and not rowsecurity;
```

## Common problems

**The Database check failed on a PR.** Read the job log.

- "doesn't match the migrations": run `make db-reset`, `make db-types` and commit `src/types/database.ts`.
- An SQL error: reproduce it with `make db-reset`, fix the file (it isn't merged, so editing is fine), and push.

**The deploy failed after merge** (Deploy database run is red). Each file is wrapped in `begin`/`commit`: earlier files applied, the failing one rolled back entirely, and the app's code is already live. Read the log with `gh run view <id> --log-failed`.

- Usually it's prod's data, which CI doesn't have (a `not null` on a column with nulls, a duplicate under a new unique index). Check with `make db-query`.
- The failed file was never applied, so fix it in a follow-up PR (editing it is allowed) or replace it with a safer migration. Merging that PR re-runs the deploy.
- If the new code depends on the failed migration, tell the user right away: the app may be erroring until the fix merges.
- If a file without `begin`/`commit` failed, part of it may have run: check with queries and rely on its statements being idempotent.

**The local stack won't start.** Is Docker running? Is a port taken by another Supabase project (`npm exec -- supabase stop --project-id <other>`)? As a last resort, `make db-stop` then `make db-start`.

**The local database is in a strange state.** `make db-reset`. It's disposable.

**`db-prod-migrations` shows a migration on prod that has no file.** Someone applied SQL outside the repo, or a branch with it isn't merged yet. Check `git log` and open PRs first. If it truly came from outside the repo, ask the user how it happened, then recreate the change as a file with the same version number. Never delete prod history to make the error go away.

**A migration was already applied by hand** (for example in the dashboard), so the deploy would fail or run it twice. Confirm with queries that its changes really are on prod, then, with the user's OK, mark it applied without running it:

```bash
make db-repair version=<timestamp> status=applied
```

**A recorded migration whose changes were undone by hand.** Confirm with queries, then with the user's OK:

```bash
make db-repair version=<timestamp> status=reverted
```

`db-repair` only edits the history table; it never runs SQL. Use it only after a query proves what's actually on prod.

**A merged migration was edited.** Prod already ran the original. Restore the file from git (`git log -p -- supabase/migrations/<file>`) and put the intended change in a new migration.

**App errors such as `column ... does not exist`.** Locally: run `make db-up` or `make db-reset`, since a teammate's migration isn't applied yet. On prod: check the latest Deploy database run and `make db-prod-migrations`.

**`permission denied` or an empty result from the app.** Check that server code uses the secret-key client and check RLS on the table. Never "fix" it by disabling RLS or granting `anon` access without the user's sign-off.

**Slow queries or advisor warnings.** Run `make db-advisors`, then fix with a migration (typically an index) through `supabase-migration`.

## Report back

Tell the user what was wrong, the evidence (command output, query results or the run log), what you changed, and what still needs their decision.
