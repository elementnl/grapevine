---
name: supabase-migration-apply
description: Apply pending Grapevine migrations to the production database and regenerate types. Use when the user asks to run, push, deploy or apply migrations. Always requires the user's explicit go-ahead, because it changes prod.
---

# Apply migrations to prod

There is only one database, production. Applying a migration changes the live game, so this is never done without the user's explicit approval in the chat for this specific push.

## Steps

1. **Check state:**

   ```bash
   make db-status
   ```

   Every migration should be either applied on both sides or local-only (pending). Anything else (remote-only, or a gap in the middle) means history has drifted: stop and use the `supabase-triage` skill.

2. **Dry run:**

   ```bash
   make db-push-dry
   ```

   Confirm it lists exactly the migrations you expect, in order.

3. **Ask the user.** Show the list of migrations that will run and summarise what each does, flagging anything destructive (drops, truncates, type changes, `not null` on existing columns). Wait for a clear yes.

4. **Push:**

   ```bash
   make db-push yes=1
   ```

   `yes=1` skips the CLI's interactive prompt, which you can't answer. You already have the user's approval from step 3.

5. **Verify:** run `make db-status` again. Everything should show as applied on both sides.

6. **Regenerate types and check the app still builds:**

   ```bash
   make db-types
   make check
   ```

   Commit `src/types/database.ts` together with the migration.

7. **Optional health check:** `make db-advisors` flags missing RLS, missing indexes on foreign keys and similar. Report anything new to the user.

## If the push fails

The failing file was rolled back (each migration is wrapped in `begin`/`commit`), and the migrations before it stay applied. Don't retry blindly; use the `supabase-triage` skill.

## Never

- Never push without the user's yes for this push. Approval for an earlier push doesn't carry over.
- Never apply schema changes any other way: not `make db-query`, not the Supabase dashboard's SQL editor, not the Supabase MCP. Those leave no migration file, and the repo drifts from prod.
