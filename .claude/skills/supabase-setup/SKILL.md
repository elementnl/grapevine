---
name: supabase-setup
description: Set up the local Supabase database for Grapevine development, or connect the CLI to prod for debugging. Use on a new machine, when `make dev` can't reach the database, when a db-* make target says Docker isn't running, or when a prod make target fails with "not logged in" or "project not linked".
---

# Supabase setup

Local development runs against a Supabase stack in Docker, built from the migrations in `supabase/migrations/`. Prod is never changed from a laptop: merging migrations into `main` deploys them (see the `supabase-migration` skill). The Supabase CLI is a dev dependency, so `make install` provides it.

## Local database

1. **Docker** must be running (Docker Desktop, OrbStack or similar). Ask the user to start it if `make db-start` says it can't connect.

2. **Start the stack.** The first run downloads images and takes a few minutes; after that it starts in seconds.

   ```bash
   make db-start
   ```

3. **Point the app at it.** `make db-status` prints the local URL and keys. Put them in `.env.local` (gitignored):

   ```
   SUPABASE_URL=http://127.0.0.1:54321
   SUPABASE_PUBLISHABLE_KEY=<Publishable key from db-status>
   SUPABASE_SECRET_KEY=<Secret key from db-status>
   ```

   Keep `OPENAI_API_KEY` if the user has one; without it, guesses just don't cluster.

4. **Admin login** for `/debug`: create a user in local Studio (http://localhost:54323 → Authentication → Add user). It exists only in the local database.

5. **Verify:** `make dev`, open http://localhost:7300, sign in at `/login`, and start a game from `/debug`.

Day to day: `make db-reset` rebuilds the database from the migrations, wiping local data. `make db-up` applies only new migrations and keeps the data. `make db-stop` stops the stack and keeps the data.

## Prod, for debugging only

The prod targets (`db-prod-migrations`, `db-query`, `db-advisors`, `db-repair`) need the CLI logged in and linked, once per machine:

1. `make db-login` opens a browser, so ask the user to run it.
2. `make db-link ref=<project-ref>`. The ref is the 20-letter id in the dashboard URL. If it asks for the database password, the user types it; never paste it into the chat.

The link lives in `supabase/.temp/`, which is gitignored.

## Deploy secrets (once per repo)

The deploy workflow needs three secrets in the GitHub environment `production` (Settings → Environments): `SUPABASE_ACCESS_TOKEN` (a personal access token), `SUPABASE_DB_PASSWORD` and `SUPABASE_PROJECT_ID` (the project ref). Only the user can add them.

## If something fails

- Port already in use: another Supabase project is running. `npm exec -- supabase stop --project-id <other>` or stop it in Docker.
- Anything else: use the `supabase-triage` skill.
