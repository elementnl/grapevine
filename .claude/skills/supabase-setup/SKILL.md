---
name: supabase-setup
description: Connect this machine's Supabase CLI to the Grapevine production project. Use when a db-* make target fails with "not logged in", "project not linked" or "cannot find project ref", or when someone is setting up the repo on a new machine.
---

# Supabase setup

Grapevine has one database: production. There is no local Supabase stack and no Docker. Every `make db-*` target talks to prod through the Supabase CLI (installed as a dev dependency, so `make install` provides it).

## Steps

1. **Log in** (once per machine). This opens a browser, so ask the user to run it themselves:

   ```bash
   make db-login
   ```

2. **Link** the repo to the project (once per machine). Ask the user for the project ref if you don't have it. It's the 20-letter id in the dashboard URL (`supabase.com/dashboard/project/<ref>`). Linking may prompt for the database password; the user should type it, never paste it into the chat.

   ```bash
   make db-link ref=<project-ref>
   ```

   The link is stored in `supabase/.temp/`, which is gitignored.

3. **Verify:** `make db-status` should list migrations without errors. A brand-new project shows an empty remote column.

4. **Backups:** remind the user to confirm in the dashboard (Database → Backups) that daily backups are on. We run migrations straight against prod, so backups are the only undo for data loss.

## If something fails

- `make db-status` asks for a password or fails on permissions: set `SUPABASE_DB_PASSWORD` in the user's shell (not in a committed file) and retry.
- Anything else: use the `supabase-triage` skill.
